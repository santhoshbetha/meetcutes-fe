import { useState } from "react";
import QRPayPal from "@/assets/QRPayPal.png";
import { Container } from "@/components/Container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Code, Lightbulb, MessageSquare, Phone, HelpCircle } from "lucide-react";

export function Contact() {
  const [qrImg, SetQrImg] = useState(QRPayPal);

  const contactMethods = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "General Inquiries",
      description: "Questions, suggestions, or feedback about MeetCutes",
      email: "hello@meetcutes.us",
      color: "blue"
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Developers",
      description: "Contribute to the platform or technical discussions",
      email: "developers@meetcutes.us",
      color: "green"
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Relationship Experts",
      description: "Share expertise in relationships and dating",
      email: "experts@meetcutes.us",
      color: "purple"
    }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <Container className="py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Mail className="w-4 h-4" />
            Get in Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Have questions, suggestions, or want to contribute? We'd love to hear from you.
            Reach out through the appropriate channels below.
          </p>
        </div>

        {/* Contact Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {contactMethods.map((method, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 bg-${method.color}-100 dark:bg-${method.color}-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <div className={`text-${method.color}-600 dark:text-${method.color}-400`}>
                    {method.icon}
                  </div>
                </div>
                <CardTitle className="text-xl">{method.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {method.description}
                </p>
                <div className="space-y-2">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <Mail className="w-3 h-3 mr-1" />
                    {method.email}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Information */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-blue-900 dark:text-blue-100">
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Response Time
                  </h4>
                  <p className="text-blue-900/80 dark:text-blue-100/80 leading-relaxed">
                    We typically respond to emails within 24-48 hours. For urgent technical issues,
                    please check our FAQ section first or reach out to our developer team.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Contributing
                  </h4>
                  <p className="text-blue-900/80 dark:text-blue-100/80 leading-relaxed">
                    Interested in contributing to MeetCutes? Whether you're a developer, relationship
                    expert, or have valuable insights, we'd love to hear your ideas and suggestions.
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-100/50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">💡 Pro Tip</h4>
                <p className="text-blue-900/80 dark:text-blue-100/80">
                  When emailing us, please include as much detail as possible about your inquiry.
                  This helps us provide you with the most accurate and helpful response.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
