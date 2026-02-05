import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

type CreateCampaignFromInvoiceBody = {
  invoiceId: string;
  campaignName: string;
  youtubeUrl: string;
  clientEmail?: string;
  clientName?: string;
  clientCompany?: string;
  salespersonEmail?: string;
  salePrice?: number;
  goalViews?: number;
  serviceType?: string;
  genre?: string;
  startDate?: string;
  endDate?: string;
  invoiceStatus?: 'tbd' | 'sent' | 'paid';
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\/\s]+)/,
      /youtube\.com\/shorts\/([^&?\/\s]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function invoiceCampaignRoutes(server: FastifyInstance) {
  // Create a campaign from an invoice (webhook endpoint for external invoice systems)
  server.post('/invoice-campaign/create', async (request, reply) => {
    const body = request.body as CreateCampaignFromInvoiceBody;
    const {
      invoiceId,
      campaignName,
      youtubeUrl,
      clientEmail,
      clientName,
      clientCompany,
      salespersonEmail,
      salePrice,
      goalViews,
      serviceType,
      genre,
      startDate,
      endDate,
      invoiceStatus,
    } = body;

    // Validate required fields
    if (!invoiceId || !campaignName || !youtubeUrl) {
      return reply.code(400).send({
        ok: false,
        message: 'Missing required fields: invoiceId, campaignName, youtubeUrl',
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      request.log.error('Supabase credentials not configured');
      return reply.code(500).send({ ok: false, message: 'Database not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Check if campaign with this invoice ID already exists
      const { data: existingCampaign } = await supabase
        .from('youtube_campaigns')
        .select('id, campaign_name')
        .eq('source_invoice_id', invoiceId)
        .single();

      if (existingCampaign) {
        return reply.code(409).send({
          ok: false,
          message: `Campaign already exists for invoice ${invoiceId}`,
          campaignId: existingCampaign.id,
          campaignName: existingCampaign.campaign_name,
        });
      }

      // Find or create client
      let clientId: string | null = null;
      if (clientEmail || clientName) {
        // Try to find existing client by email
        if (clientEmail) {
          const { data: existingClient } = await supabase
            .from('youtube_clients')
            .select('id')
            .eq('email', clientEmail)
            .single();

          if (existingClient) {
            clientId = existingClient.id;
          }
        }

        // Create new client if not found
        if (!clientId && clientName) {
          const { data: newClient, error: clientError } = await supabase
            .from('youtube_clients')
            .insert({
              name: clientName,
              email: clientEmail || null,
              company: clientCompany || null,
              org_id: DEFAULT_ORG_ID,
            })
            .select()
            .single();

          if (clientError) {
            request.log.warn('Failed to create client:', clientError);
          } else {
            clientId = newClient.id;
          }
        }
      }

      // Find salesperson by email
      let salespersonId: string | null = null;
      if (salespersonEmail) {
        const { data: salesperson } = await supabase
          .from('youtube_salespersons')
          .select('id')
          .eq('email', salespersonEmail)
          .single();

        if (salesperson) {
          salespersonId = salesperson.id;
        }
      }

      // Extract video ID from URL
      const videoId = extractVideoId(youtubeUrl);

      // Create the campaign
      const campaignData = {
        campaign_name: campaignName,
        youtube_url: youtubeUrl,
        video_id: videoId,
        client_id: clientId,
        salesperson_id: salespersonId,
        service_type: serviceType || 'worldwide',
        genre: genre || null,
        goal_views: goalViews || 0,
        sale_price: salePrice || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'pending',
        source_invoice_id: invoiceId,
        invoice_status: invoiceStatus || 'sent', // Default to 'sent' when created from invoice
        org_id: DEFAULT_ORG_ID,
        youtube_api_enabled: true, // Enable stats tracking
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('youtube_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) {
        request.log.error('Failed to create campaign:', campaignError);
        return reply.code(500).send({
          ok: false,
          message: 'Failed to create campaign',
          error: campaignError.message,
        });
      }

      request.log.info(`Campaign created from invoice ${invoiceId}: ${campaign.id}`);

      // Notify ops about new campaign (if configured)
      try {
        const notifyResponse = await server.inject({
          method: 'POST',
          url: '/api/campaign-created-notify',
          payload: {
            service: 'youtube',
            campaignId: campaign.id,
            campaignName: campaignName,
            youtubeUrl: youtubeUrl,
            clientName: clientName || null,
          },
        });
        request.log.info('Ops notification sent:', notifyResponse.statusCode);
      } catch (notifyError) {
        request.log.warn('Failed to send ops notification:', notifyError);
        // Don't fail the request if notification fails
      }

      return reply.code(201).send({
        ok: true,
        message: 'Campaign created successfully',
        campaign: {
          id: campaign.id,
          campaignName: campaign.campaign_name,
          youtubeUrl: campaign.youtube_url,
          status: campaign.status,
          invoiceId: campaign.source_invoice_id,
          clientId: campaign.client_id,
        },
      });
    } catch (error) {
      request.log.error('Error creating campaign from invoice:', error);
      return reply.code(500).send({
        ok: false,
        message: 'Server error while creating campaign',
      });
    }
  });

  // Update invoice status for a campaign
  server.patch('/invoice-campaign/:campaignId/invoice-status', async (request, reply) => {
    const { campaignId } = request.params as { campaignId: string };
    const { invoiceStatus } = request.body as { invoiceStatus: 'tbd' | 'sent' | 'paid' };

    if (!campaignId || !invoiceStatus) {
      return reply.code(400).send({
        ok: false,
        message: 'Missing required fields: campaignId, invoiceStatus',
      });
    }

    if (!['tbd', 'sent', 'paid'].includes(invoiceStatus)) {
      return reply.code(400).send({
        ok: false,
        message: 'Invalid invoice status. Must be: tbd, sent, or paid',
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return reply.code(500).send({ ok: false, message: 'Database not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      const { data, error } = await supabase
        .from('youtube_campaigns')
        .update({ invoice_status: invoiceStatus })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        request.log.error('Failed to update invoice status:', error);
        return reply.code(500).send({
          ok: false,
          message: 'Failed to update invoice status',
        });
      }

      return reply.code(200).send({
        ok: true,
        message: 'Invoice status updated',
        campaign: {
          id: data.id,
          invoiceStatus: data.invoice_status,
        },
      });
    } catch (error) {
      request.log.error('Error updating invoice status:', error);
      return reply.code(500).send({
        ok: false,
        message: 'Server error',
      });
    }
  });

  // Get campaign by invoice ID
  server.get('/invoice-campaign/by-invoice/:invoiceId', async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };

    if (!invoiceId) {
      return reply.code(400).send({
        ok: false,
        message: 'Missing invoiceId',
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return reply.code(500).send({ ok: false, message: 'Database not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      const { data, error } = await supabase
        .from('youtube_campaigns')
        .select(`
          id,
          campaign_name,
          youtube_url,
          status,
          source_invoice_id,
          invoice_status,
          goal_views,
          current_views,
          current_likes,
          current_comments,
          created_at
        `)
        .eq('source_invoice_id', invoiceId)
        .single();

      if (error || !data) {
        return reply.code(404).send({
          ok: false,
          message: `No campaign found for invoice ${invoiceId}`,
        });
      }

      return reply.code(200).send({
        ok: true,
        campaign: data,
      });
    } catch (error) {
      request.log.error('Error fetching campaign by invoice:', error);
      return reply.code(500).send({
        ok: false,
        message: 'Server error',
      });
    }
  });
}
