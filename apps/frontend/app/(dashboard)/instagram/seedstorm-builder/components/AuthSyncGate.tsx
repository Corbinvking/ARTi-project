import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { migrateCreatorsToSupabase } from '../lib/creatorMigration';
import { getCreators } from '../lib/localStorage';
import { Loader2 } from 'lucide-react';

interface AuthSyncGateProps {
  children: React.ReactNode;
}

const AuthSyncGate = ({ children }: AuthSyncGateProps) => {
  const { user, loading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSync, setHasSync] = useState(false);

  useEffect(() => {
    const syncLocalCreators = async () => {
      if (!user || loading || hasSync || isSyncing) return;
      
      try {
        setIsSyncing(true);
        
        // Check if there are local creators to sync
        const localCreators = await getCreators();
        if (localCreators.length === 0) {
          setHasSync(true);
          return;
        }

        // Migrate local creators to Supabase
        const { success, migrated } = await migrateCreatorsToSupabase();
        
        if (success && migrated > 0) {
          console.log(`Successfully synced ${migrated} creators to database`);
        }
        
        setHasSync(true);
      } catch (error) {
        console.error('Error syncing creators:', error);
        setHasSync(true); // Continue even if sync fails
      } finally {
        setIsSyncing(false);
      }
    };

    syncLocalCreators();
  }, [user, loading, hasSync, isSyncing]);

  // Show loading while syncing
  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Syncing your data...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthSyncGate;