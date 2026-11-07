import { useState } from "react";
import QRPayPal from "@/assets/QRPayPal.png";
import { Container } from "@/components/Container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  DollarSign,
  Heart,
  Image,
  MapPin,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function Donate() {
  const [qrImg, SetQrImg] = useState(QRPayPal);

  const supportAreas = [
    {
      icon: <MapPin className="w-5 h-5" />,
      title: "Real-Time Proximity",
      description:
        "Funds live 100-mile discovery lookups and the geospatial geohash math behind every local match.",
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "Secure Data Foundations",
      description:
        "Keeps profile, relationship, and location data protected in managed PostgreSQL storage.",
    },
    {
      icon: <Image className="w-5 h-5" />,
      title: "Direct Image Pipelines",
      description:
        "Covers R2 storage and delivery so photos stay fast, private, and free of ad-network tracking.",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <Container className="py-8 md:py-12">
        {/* Premium milestone transparency notice */}
        <div className="bg-primary/5 border border-primary/20 text-foreground rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Free for early members. Premium only at scale.
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                MeetCutes is designed to be completely free for early members. A
                premium membership fee of $50/year applies{" "}
                <strong className="font-semibold text-foreground">
                  ONLY
                </strong>{" "}
                when your local discovery pool reaches a tipping point of
                200+ active matching prospects within a 100-mile radius.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Support MeetCutes
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Help Us Stay Free While We Grow
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            MeetCutes is in its bootstrapping phase. Real-time proximity
            lookups, geospatial geohash math, secure PostgreSQL storage, and
            direct R2 image pipelines all carry an ongoing cost before the
            platform reaches self-sustainability. Your support helps us keep
            discovery open, private, and ad-free while we scale.
          </p>
        </div>

        {/* Main Donation Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="shadow-2xl border-0 bg-linear-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-teal-950/20">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-3xl md:text-4xl text-emerald-900 dark:text-emerald-100 mb-4">
                Fund the Bootstrapping Phase
              </CardTitle>
              <p className="text-lg text-emerald-900/80 dark:text-emerald-100/80 leading-relaxed">
                Every contribution helps cover the negative operating costs of
                running a location-heavy platform while we scale toward
                self-sustainability. No ads, no data brokers, no hidden fees.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* PayPal Button */}
              <div className="text-center">
                <form
                  action="https://www.paypal.com/donate"
                  method="post"
                  target="_blank"
                  className="inline-block"
                >
                  <input
                    type="hidden"
                    name="hosted_button_id"
                    value="2CBVQ367ZGLPC"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Donate via PayPal
                  </Button>
                  <img
                    alt=""
                    border="0"
                    src="https://www.paypal.com/en_US/i/scr/pixel.gif"
                    width="1"
                    height="1"
                  />
                </form>
              </div>

              {/* QR Code */}
              <div className="text-center space-y-4">
                <div className="inline-block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <img
                    className="w-48 h-48 border-4 border-gray-100 dark:border-gray-600 rounded-xl"
                    src={qrImg}
                    alt="PayPal QR Code"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan QR code with your phone's camera or PayPal app
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Where support goes */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Where Your Support Goes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every contribution is directed at the real infrastructure cost of
            keeping a proximity-first platform online.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {supportAreas.map((area, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-8 pb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-primary">
                    {area.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-3">{area.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {area.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Roadmap and sustainability */}
        <Card className="shadow-xl border border-primary/15 bg-linear-to-br from-primary/5 via-background to-emerald-500/5">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl text-foreground">
              Bootstrapping Today. Self-Sustaining Tomorrow.
            </CardTitle>
            <p className="text-muted-foreground max-w-2xl mx-auto pt-3 leading-relaxed">
              We believe you deserve to know exactly what this stage costs and
              exactly when the donation page goes away.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-bold text-foreground">
                    The Bootstrapping Phase
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Running real-time proximity lookups, geospatial geohash math,
                  secure PostgreSQL storage, and direct R2 image pipelines is a
                  location-heavy operation. While the platform is scaling, every
                  one of those services carries an ongoing negative cost.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  <h3 className="font-bold text-foreground">
                    The Sustainability Goal
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This dedicated donation page is a temporary bridge. As soon as
                  our active local matching ecosystem reaches high volumes and
                  premium subscription thresholds take over, this donation
                  portal will be completely and permanently removed.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Heart
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-bold text-foreground">
                    Support the Early Adopters
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    If MeetCutes is useful to you today, help cover the negative
                    operating costs that keep the platform pure, private, and
                    ad-free during this critical growth stage. Your support buys
                    time for the community to reach the premium threshold on its
                    own.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
