import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { isObjEmpty } from "../utils/util";
import { useAuth } from "../context/AuthContext";
import { searchUser } from "../services/search.service";
import { Spinner } from '@/components/ui/spinner';
import { UserCard }from "@/components/UserCard";
import { Search as SearchIcon, Users, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function Search() {
  const navigate = useNavigate();
  const { profiledata } = useAuth();
  const [searchtext, setSearchtext] = useState("");
  const [userdata, setUserdata] = useState({});
  const [usercoordsset, setUsercoordsset] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchdone = useRef(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!isObjEmpty(userdata)) {
      setUsercoordsset(userdata?.defaultcoordsset || userdata?.usercoordsset || userdata?.exactcoordsset)
    }
  }, [userdata]);

  useEffect(() => {
    if (searchdone.current && resultsRef.current) {
      // Scroll to results section with smooth behavior
      resultsRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [searchdone.current, userdata]);

    const handleSearchSubmit = async (e) => {
        e.preventDefault()
        
        var phoneregex = /^\d{10}$/;
        var emailregex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        var useridregex = /^\d{5,7}$/;

        //https://www.makeuseof.com/regular-expressions-validate-user-account/
        //he number of characters must be between 5 and 15
        //The string should only contain alphanumeric characters and/or underscores (_). 
        //The first character of the string should be alphabetic. 
        var userhandleregex = /^[A-Za-z][A-Za-z0-9_]{4,14}$/;

        if (searchtext.match(emailregex) || searchtext.match(phoneregex) || searchtext.match(userhandleregex)) 
        {
          setLoading(true)
          const res = await searchUser(searchtext);
          if (res.success) {
            setUserdata(res.data)
          } else {
            setUserdata({})
          }
        } else {
          toast.error("Invalid email, phone number, or user handle. Please check your input and try again.");
        }
        setSearchtext("");
        searchdone.current = true;
        setLoading(false) //false
    }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
            <SearchIcon className="w-4 h-4" />
            Find Someone
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            Search Users
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Find and connect with other MeetCutes members using their email, phone number, or handle.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
          <Card className="shadow-2xl border-0 bg-linear-to-br from-card via-card to-card/95 backdrop-blur-sm">
            {loading && (
              <Spinner
                className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50'
                size="xlarge"
                text="Searching..."
              />
            )}
            <CardHeader className="text-center pb-4 sm:pb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl">Search User</CardTitle>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 px-4">
                Enter an email address, phone number, or user handle to find someone
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleSearchSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="searchtext" className="text-sm sm:text-base font-semibold">
                    Search Query
                  </Label>
                  <Input
                    id="searchtext"
                    type="text"
                    placeholder="example@email.com or +1234567890 or @username"
                    value={searchtext}
                    onChange={(e) => setSearchtext(e.target.value)}
                    className="h-10 sm:h-12 text-sm sm:text-base border-2 focus:border-primary/50"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground px-2">
                    Enter a valid email, 10-digit phone number, or user handle (5-15 characters, starts with letter)
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 h-10 sm:h-12 px-4 py-2 border border-border/60 bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-md inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  {profiledata?.userstate == 'active' ? (
                    <button
                      type='submit'
                      className="flex-1 h-10 sm:h-12 px-4 py-2 bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/25 hover:bg-primary/90 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <SearchIcon className="w-4 h-4" />
                      Search
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex-1 h-10 sm:h-12 px-4 py-2 bg-muted text-muted-foreground cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                      disabled={true}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Activate Profile First
                    </button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        <div ref={resultsRef} className="max-w-2xl mx-auto space-y-6">
          {/* No Results */}
          {isObjEmpty(userdata) && searchdone.current && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      No User Found
                    </h3>
                    <p className="text-amber-900/80 dark:text-amber-100/80">
                      We couldn't find a user matching your search input. Please check your input and try again.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      searchdone.current = false;
                      setUserdata(null);
                    }}
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  >
                    Try Another Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Found */}
          {!isObjEmpty(userdata) && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      User Found!
                    </h3>
                    <p className="text-green-900/80 dark:text-green-100/80">
                      Click below to view their profile and connect.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Card */}
          {!isObjEmpty(userdata) && (
            <div className="flex justify-center">
              <Link
                to={{ pathname: `/user/${userdata?.userid}` }}
                onClick={() => {
                  localStorage.setItem('userstate', JSON.stringify({ backbutton: false }));
                }}
                className="transform transition-transform hover:scale-105"
              >
                <UserCard
                  setSelectedUser={null}
                  profile={userdata}
                />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
