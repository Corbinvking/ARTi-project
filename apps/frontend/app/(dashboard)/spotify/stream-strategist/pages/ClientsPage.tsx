import { ClientManager } from '../components/ClientManager';
import Layout from '../components/Layout';

export default function ClientsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        <ClientManager />
      </div>
    </Layout>
  );
}







