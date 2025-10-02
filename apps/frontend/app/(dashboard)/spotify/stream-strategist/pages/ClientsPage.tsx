import { ClientManager } from '../components/ClientManager';
import Layout from '../components/Layout';

export default function ClientsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-6">
        <ClientManager />
      </div>
    </Layout>
  );
}







