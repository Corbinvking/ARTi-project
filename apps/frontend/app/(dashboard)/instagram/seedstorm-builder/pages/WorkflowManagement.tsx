import React from 'react';
import { WorkflowDashboard } from '../components/WorkflowDashboard';
import { Breadcrumbs } from '../components/Breadcrumbs';

const WorkflowManagement = () => {
  return (
    <div className="container mx-auto max-w-7xl px-8 py-6">
      <Breadcrumbs />
      <WorkflowDashboard />
    </div>
  );
};

export default WorkflowManagement;