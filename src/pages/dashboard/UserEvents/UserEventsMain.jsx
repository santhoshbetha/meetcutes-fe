import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserEventsSub1 } from "./UserEventsSub1";
import { UserEventsSub2 } from "./UserEventsSub2";
import { Calendar, Users, ShieldAlert } from "lucide-react";
import { isObjEmpty } from "../../../utils/util";
import { useSearchStore } from "@/stores/searchStore";

export function UserEventsMain({
  profiledata,
  userhandle,
  latitude,
  longitude,
  questionairevaluesset,
  userstate,
  onetimepaymentrequired
}) {
  const [error, setError] = useState("");
  const defaultTab2 = useSearchStore((state) => state.defaultTab2);
  const setDefaultTab2 = useSearchStore((state) => state.setDefaultTab2);

  useEffect(() => {
    if (onetimepaymentrequired) {
      setError("One time fees required, click on 'SERVICE FEES' button");
    } else if (isObjEmpty(userhandle)) {
      setError("Set handle to start searching");
    } else if (isObjEmpty(latitude)) {
      setError("Set co-ordinates to start searching");
    } else if (userstate !== 'active') {
      setError("Activate your Profile");
    } else {
      setError("");
    }
  }, [userhandle, latitude, questionairevaluesset, userstate, onetimepaymentrequired]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Shared extra-wide dashboard content footprint. */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">

        {/* Header Introduction Block */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">
            Your Events
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Manage your created events and track the events you're attending
          </p>
        </div>

        {/* Dynamic Error Warning Banner (Rendered Context Restored) */}
        {error && (
          <Card className="border-destructive/40 bg-destructive/5 max-w-2xl mx-auto animate-fadeIn">
            <CardContent className="p-4 flex items-center gap-3 text-destructive font-medium text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Main Interface Interaction Card Wrapper */}
        <Card className="shadow-lg bg-card/60 backdrop-blur-md border border-border">
          <CardContent className="p-4 sm:p-6">

            <Tabs
              value={defaultTab2}
              onValueChange={setDefaultTab2}
              className="w-full space-y-6"
            >

              {/* Responsive Tab Toggle Row Header */}
              <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 h-12 rounded-xl">
                <TabsTrigger
                  value="createdevents"
                  className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Calendar className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-primary" />
                  <span className="hidden sm:inline">Events You Created</span>
                  <span className="sm:hidden">Created</span>
                </TabsTrigger>

                <TabsTrigger
                  value="registeredevents"
                  className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Users className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-primary" />
                  <span className="hidden sm:inline">Events You're Attending</span>
                  <span className="sm:hidden">Attending</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB CONTENT 1: CREATED EVENTS PANEL */}
              <TabsContent value="createdevents" className="mt-0 focus-visible:outline-none animate-fadeIn">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/60">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Managed Events</h3>
                      <p className="text-xs text-muted-foreground">Events you've organized and are actively managing</p>
                    </div>
                  </div>

                  <UserEventsSub1
                    profiledata={profiledata}
                    userhandle={userhandle}
                    latitude={latitude}
                    longitude={longitude}
                    userstate={userstate}
                    error={error}
                  />
                </div>
              </TabsContent>

              {/* TAB CONTENT 2: REGISTERED ATTENDING EVENTS PANEL */}
              <TabsContent value="registeredevents" className="mt-0 focus-visible:outline-none animate-fadeIn">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/60">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Attending Events</h3>
                      <p className="text-xs text-muted-foreground">Events you've registered for and plan to visit</p>
                    </div>
                  </div>

                  <UserEventsSub2
                    profiledata={profiledata}
                    userhandle={userhandle}
                    latitude={latitude}
                    longitude={longitude}
                  />
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}