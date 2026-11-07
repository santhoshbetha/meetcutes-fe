import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from '@/components/ui/spinner';
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fuzzCoordinates, isObjEmpty } from "../utils/util";
import { cities } from '@/lib/cities'
import { coords } from '@/lib/defaultcoords'
import { useAuth } from "@/context/AuthContext";
import { useOnlineStatus} from "@/hooks/useOnlineStatus";
import { useUpdateProfileMutation } from "@/hooks/useProfileQueries";
import dayjs from 'dayjs'
import { toast } from "sonner";

const delay = ms => new Promise(res => setTimeout(res, ms));

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "Washington DC"
];

export function ChangeLocation({ onClose }) {
  const { userSession, profiledata } = useAuth();
  const updateProfileMutation = useUpdateProfileMutation();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState("");
  const [city, setCity] = useState("")
  const isOnline = useOnlineStatus();
  const [allowlocationchange, setAllowlocationchange] = useState(false);
  const datenow = new Date(Date.now());
  const currentState = profiledata?.state;
  const currentCity = profiledata?.city;

  const getCity = (stateIn) => {
    if (!isObjEmpty(stateIn)) {
      let cityList = cities[stateIn] || [];
      if (stateIn === currentState) {
        cityList = cityList.filter(c => c !== currentCity);
      }
      return cityList.map((city, idx) => {
        return (
          <SelectItem key={idx} value={city}>
            {city}
          </SelectItem>
        );
      });
    }
  };

  useEffect(() => {
    if (!isObjEmpty(profiledata)) {
        if (!isObjEmpty(profiledata?.dateoflocation)) {
            let dif = Math.abs(datenow - new Date(profiledata?.dateoflocation))
            let dayssincelocationchange = Math.floor(dif/(1000 * 3600 * 24))
            if (dayssincelocationchange > 30) { //1 month
                ////console.log("useEffect isOpen allow change true")
                setAllowlocationchange(true)
            } else {
                setAllowlocationchange(false) 
            }
        } else {
          setAllowlocationchange(true)
        }
    }
  }, [profiledata, datenow]);

  const handleLocationSubmit = async (e) => {
      e.preventDefault()
      setLoading(true)
      if (isOnline) {
          if (userSession) {
              let dateoflocation = (new Date()).toISOString().substring(0, 10).toString();
              const fuzzyCoordinates = fuzzCoordinates(
                coords[state][city].lat,
                coords[state][city].lng,
              );
            //  setOpaque("opacity-35 bg-[#F5F5F5]")
              try {
                  let newlocationdata = { 
                      state: state,
                      city: city,
                      latitude: fuzzyCoordinates.lat,
                      longitude: fuzzyCoordinates.lng,
                      defaultcoordsset: true,
                      usercoordsset: false, 
                      exactcoordsset: false,
                      dateoflocation: dateoflocation
                  }

                  await updateProfileMutation.mutateAsync(newlocationdata);
                  toast.success("Location changed successfully!");
                  delay(1000).then(async () => {
                      setLoading(false)
                      if (onClose) onClose();
                  })
              } catch (error) {
                  toast.error(error?.message || "Failed to change location. Please try again.");
                  setLoading(false);
              }
          } else {
              toast.error("Authentication error. Please logout and login again.");
          }
      } else {
          toast.error("You are offline. Check your internet connection.");
      }
  }

  return (
    <DialogContent>
        {loading && (
          <Spinner 
            className="absolute top-[50%] left-[50%] cursor-pointer"
            size={50}
            withText={true}
            text="Changing Location..."
          />
        )}
        <DialogTitle>
          {allowlocationchange ? "Select your new Location" : "Location change not allowed"}
          <br />
          <span className="text-sm mt-2">Current:({profiledata?.city}, {profiledata?.state})</span>
        </DialogTitle>
        <DialogDescription></DialogDescription>
        <div>
          {allowlocationchange ?
              <form onSubmit={handleLocationSubmit}>
                <div className="flex flex-col md:flex-row gap-2">
                  <Select
                    required
                    name="state"
                    onValueChange={(value) => {
                        setState(value)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-[48%]">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {states.map((state, idx) => (
                          <SelectItem key={idx} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                      required
                      name="city"
                      onValueChange={(value) => {
                        setCity(value)
                      }}
                      >
                      <SelectTrigger className="w-full  md:w-[48%]">
                          <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectGroup>
                              {getCity(state)}
                          </SelectGroup>
                      </SelectContent>
                  </Select>
                </div>
                <div className="flex mt-3">
                  <Button className="ms-auto" type="submit">
                      Submit
                  </Button>
                </div>
              </form>
              :
              <>
              <div className='text-red-700 text-lg'>
                  Only one location change is allowed per month.
              </div>
              <div className='text-md'>
                  Your last set date: &nbsp;
                  <span className='text-green-700 font-bold'>
                  {dayjs(profiledata?.dateoflocation).format('MMM D, YYYY')}
                  </span>
              </div>
              </>
            }
        </div>
    </DialogContent>
  );
}