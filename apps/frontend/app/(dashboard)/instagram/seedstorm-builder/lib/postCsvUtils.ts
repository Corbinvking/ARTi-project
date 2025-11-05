import Papa from 'papaparse';
import { validateInstagramUrl, detectPostType } from './instagramUtils';

export interface CsvPostData {
  instagram_handle: string;
  post_url: string;
  post_type: string;
  content_description?: string;
  posted_at?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagement_rate?: number;
}

export interface CsvImportResult {
  data: CsvPostData[];
  errors: Array<{ row: number; error: string; data: any }>;
  totalRows: number;
}

export const generatePostsCsvTemplate = (): string => {
  const headers = [
    'instagram_handle',
    'post_url',
    'post_type',
    'content_description',
    'posted_at',
    'views',
    'likes',
    'comments',
    'shares',
    'engagement_rate'
  ];

  const exampleData = [
    [
      '@creator1',
      'https://instagram.com/p/abc123',
      'reel',
      'Dance video with trending sound',
      '2024-01-15T10:30',
      '15000',
      '1200',
      '89',
      '45',
      '8.9'
    ],
    [
      '@creator2',
      'https://instagram.com/reel/def456',
      'reel',
      'Behind the scenes content',
      '2024-01-16T14:20',
      '8500',
      '890',
      '67',
      '23',
      '11.6'
    ]
  ];

  const csvContent = [headers, ...exampleData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

export const downloadCsvTemplate = (): void => {
  const content = generatePostsCsvTemplate();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `instagram-posts-template-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const parsePostsCsv = (file: File): Promise<CsvImportResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: function(results) {
        try {
          console.log('CSV parsing complete. Raw data:', results.data);
          console.log('CSV headers:', results.meta.fields);
          
          const data: CsvPostData[] = [];
          const errors: Array<{ row: number; error: string; data: any }> = [];

          results.data.forEach((row: any, index: number) => {
            try {
              // Clean and validate the handle
              let handle = String(row.instagram_handle || '').trim();
              if (!handle) {
                errors.push({
                  row: index + 1,
                  error: 'Instagram handle is required',
                  data: row
                });
                return;
              }

              // Ensure handle starts with @
              if (!handle.startsWith('@')) {
                handle = '@' + handle;
              }

              // Validate URL
              const url = String(row.post_url || '').trim();
              if (!url) {
                errors.push({
                  row: index + 1,
                  error: 'Post URL is required',
                  data: row
                });
                return;
              }

              const urlValidation = validateInstagramUrl(url);
              if (!urlValidation.isValid) {
                errors.push({
                  row: index + 1,
                  error: `Invalid URL: ${urlValidation.error}`,
                  data: row
                });
                return;
              }

              // Parse numbers safely
              const parseNumber = (value: any): number => {
                if (!value && value !== 0) return 0;
                const str = String(value).replace(/[,\s]/g, '');
                const num = parseFloat(str);
                return isNaN(num) ? 0 : num;
              };

              // Auto-detect post type from URL if not provided or invalid
              let postType = String(row.post_type || '').toLowerCase().trim();
              const validPostTypes = ['reel', 'post', 'story', 'carousel'];
              if (!validPostTypes.includes(postType)) {
                postType = urlValidation.postType;
              }

              // Parse posted_at date
              let postedAt = row.posted_at ? String(row.posted_at).trim() : undefined;
              if (postedAt && !postedAt.includes('T')) {
                // If only date is provided, add default time
                postedAt += 'T12:00';
              }

              data.push({
                instagram_handle: handle,
                post_url: url,
                post_type: postType,
                content_description: row.content_description ? String(row.content_description).trim() : undefined,
                posted_at: postedAt,
                views: parseNumber(row.views),
                likes: parseNumber(row.likes),
                comments: parseNumber(row.comments),
                shares: parseNumber(row.shares),
                engagement_rate: parseNumber(row.engagement_rate)
              });

            } catch (error) {
              errors.push({
                row: index + 1,
                error: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                data: row
              });
            }
          });

          resolve({
            data,
            errors,
            totalRows: results.data.length
          });

        } catch (error) {
          console.error('Failed to parse CSV file:', error);
          reject(new Error('Failed to parse CSV file. Please check the format.'));
        }
      },
      error: function(error) {
        console.error('CSV parsing error:', error);
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

export const exportPostsCsv = (posts: any[]): void => {
  const headers = [
    'Instagram Handle',
    'Post URL',
    'Post Type',
    'Content Description',
    'Posted At',
    'Views',
    'Likes',
    'Comments',
    'Shares',
    'Engagement Rate',
    'Status'
  ];

  const data = posts.map(post => [
    post.instagram_handle,
    post.post_url,
    post.post_type,
    post.content_description || '',
    post.posted_at ? new Date(post.posted_at).toISOString().slice(0, 16) : '',
    post.latest_analytics?.views || 0,
    post.latest_analytics?.likes || 0,
    post.latest_analytics?.comments || 0,
    post.latest_analytics?.shares || 0,
    post.latest_analytics?.engagement_rate ? `${post.latest_analytics.engagement_rate}%` : '',
    post.status
  ]);

  const csvContent = [headers, ...data].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `campaign-posts-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};