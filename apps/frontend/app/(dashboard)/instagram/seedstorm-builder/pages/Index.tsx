// Temporarily using minimal version to debug infinite loop
// import HomePage from './HomePage';

const Index = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Instagram Dashboard</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Minimal test - checking for infinite loop...
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-2">Test Card 1</h3>
          <p className="text-muted-foreground">If you see this, basic rendering works!</p>
        </div>
        <div className="p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-2">Test Card 2</h3>
          <p className="text-muted-foreground">No Radix UI components here</p>
        </div>
        <div className="p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-2">Test Card 3</h3>
          <p className="text-muted-foreground">Pure HTML and Tailwind</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
