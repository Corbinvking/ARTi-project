import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

const Help = () => {
  const faqs = [
    {
      question: "How do I create a new campaign?",
      answer: "Navigate to the Dashboard and click 'Create Campaign' button. Fill in the required information including campaign name, YouTube URL, client details, and service type."
    },
    {
      question: "What does 'Ratio Fixer' mean?",
      answer: "The Ratio Fixer helps optimize engagement ratios for campaigns by managing comments, likes, and views to maintain natural-looking engagement patterns."
    },
    {
      question: "How are vendor payments calculated?",
      answer: "Vendor payments are automatically calculated based on current views, service type, and pricing tiers. The calculation considers the number of views achieved and the rate per 1,000 views."
    },
    {
      question: "What are the different campaign statuses?",
      answer: "Campaigns can be: Pending (awaiting setup), Active (currently running), Complete (finished), or other status indicators that track the campaign lifecycle."
    },
    {
      question: "How do I request YouTube access for a client?",
      answer: "In the campaign details, enable 'Ask for Access' which will trigger automated emails to request YouTube analytics access from the client."
    },
    {
      question: "What's the difference between user roles?",
      answer: "Admin: Full system access; Manager: Campaign management and oversight; Salesperson: Campaign tracking and client management for their assigned campaigns."
    }
  ];


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Help & Support
          </h1>
          <p className="text-muted-foreground mt-2">
            Find answers to common questions and get the help you need.
          </p>
        </div>


        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="grid gap-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Help;