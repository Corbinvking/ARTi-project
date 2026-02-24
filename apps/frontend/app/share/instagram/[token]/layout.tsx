import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: campaign } = await supabase
    .from('instagram_campaigns')
    .select('campaign, name, clients')
    .or(`public_token.eq.${params.token},id.eq.${params.token}`)
    .maybeSingle();

  const title = campaign?.campaign || campaign?.name || 'Campaign Tracking';
  const client = campaign?.clients || '';
  const description = client
    ? `Instagram Campaign Tracking for ${client}`
    : 'Instagram Campaign Tracking — Live post metrics and performance';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function ShareInstagramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
