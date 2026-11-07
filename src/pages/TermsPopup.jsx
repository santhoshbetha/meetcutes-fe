import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/Container'
import { useAutocompleteStore } from '@/stores/autocompleteStore'
import { logoutUser } from '@/services/user.service'
import secureLocalStorage from 'react-secure-storage'
import { useAuth } from '@/context/AuthContext'
import { useUpdateProfileMutation } from '@/hooks/useProfileQueries'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const delay = ms => new Promise(res => setTimeout(res, ms));

export function TermsPopup() {
    const {user, profiledata, setProfiledata, resetJustLoggedIn} = useAuth();
    const updateProfileMutation = useUpdateProfileMutation();
    const [agree, setAgree] = useState(false);
    let [disabledclass, setDisabledclass] = useState("disabled");
    const [termsAdding, setTermsAdding] = useState(false);
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const resetAutocompleteData = useAutocompleteStore((state) => state.reset);

    useEffect(() => {
        delay(1200).then(() => {
            if (profiledata?.termsaccepted == false) {
                setShowModal(true)
                // Reset the justLoggedIn flag since TermsPopup is now shown
                resetJustLoggedIn();
            }
        })
    }, [profiledata, resetJustLoggedIn]);

    const onDisagreeClick = async (e) => {
        e.preventDefault();
        // Close the dialog - handleDialogChange will handle the logout
        setShowModal(false)
    }

    const checkboxHandler = () => {
        // if agree === true, it will be set to false
        // if agree === false, it will be set to true
        setAgree(!agree);
        if (!agree) {
            setDisabledclass("")
        } else {
            setDisabledclass("disabled")
        }
        // Don't miss the exclamation mark
    }

    const setTermsaccepted = async () => {
        let termsaccepted = true;
        try {
            await updateProfileMutation.mutateAsync({termsaccepted: termsaccepted});
            setShowModal(false)
            setTermsAdding(false)
        } catch (error) {
          alert(error?.message || 'Something wrong. Try again later')
        }
        setTermsAdding(false)
    }

    const onAgreeClick = async (e) => {
        e.preventDefault();
        if (agree) {
            setTermsAdding(true)
            await setTermsaccepted()
        } else { 
            alert("Click 'I agree' checkbox")
        }
    }

    const handleDialogChange = async (open) => {
        setShowModal(open);
        // If dialog is closed without agreeing, logout the user
        if (!open && !profiledata?.termsaccepted) {
            if (user) {
                localStorage.clear(); 
                secureLocalStorage.clear();
                setProfiledata({});
                setProfiledata(null)
                resetAutocompleteData()
                
                if (await logoutUser() == true) {
                  navigate('/')
                }
            }
        }
    }
 
    return (
        <Dialog open={showModal} onOpenChange={handleDialogChange}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <ScrollArea className="h-[70vh] pr-4">
                    {termsAdding && (
                        <Spinner
                            className='fixed top-[50%] left-[50%] z-50 cursor-pointer'
                            size="large" 
                        />
                    )}

                    <DialogHeader>
                        <DialogTitle className="text-center text-foreground">Welcome to MeetCutes</DialogTitle>
                    </DialogHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-foreground mb-2">Terms of Service</h2>
                                <p className="text-muted-foreground">Last updated: January 20, 2026</p>
                            </div>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-3">Welcome to MeetCutes</h3>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    MeetCutes is a platform designed to help you discover events and connect with people who share your interests.
                                    These terms of service outline how you can use our platform responsibly and respectfully.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-3">Using MeetCutes</h3>
                                <ul className="space-y-2 text-muted-foreground text-sm">
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Provide accurate information when creating your account</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>You're responsible for all activity under your account</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>MeetCutes is for adults 18 years and older</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Use the platform at your own discretion</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-3">Community Guidelines</h3>
                                <p className="text-muted-foreground text-sm mb-3">
                                    To keep MeetCutes a positive space for everyone, we ask that you:
                                </p>
                                <ul className="space-y-2 text-muted-foreground text-sm">
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Be respectful and kind to other users</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Do not post inappropriate, offensive, or explicit content</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Avoid harassment, threats, or abusive behavior</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Do not share false information or impersonate others</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2">•</span>
                                        <span>Use the platform only for connecting through events</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-3">Prohibited Activities</h3>
                                <p className="text-muted-foreground text-sm mb-3">
                                    The following activities are not allowed:
                                </p>
                                <ul className="space-y-2 text-muted-foreground text-sm">
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-2">•</span>
                                        <span>Posting advertisements or commercial content</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-2">•</span>
                                        <span>Using automated tools, bots, or scrapers</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-2">•</span>
                                        <span>Engaging in fraudulent or illegal activities</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-red-500 mr-2">•</span>
                                        <span>Creating multiple accounts for deceptive purposes</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-3">Safety First</h3>
                                <p className="text-muted-foreground text-sm">
                                    We encourage safe practices when meeting people in person, including meeting in public places
                                    and informing others of your plans. You use MeetCutes at your own risk.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-3">Membership and Premium Access</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    A membership fee of $50 (valid for 1 full year) will be applied automatically once the active match volume around your coordinates exceeds 200 profiles.
                                </p>
                            </section>

                            <div className="border-t pt-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="agree"
                                        onChange={checkboxHandler}
                                        className="rounded border-gray-300"
                                    />
                                    <label htmlFor="agree" className="text-sm text-foreground">
                                        I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>
                                    </label>
                                </div>
                            </div>
                        </div>
                    
                <div>
                    <div className="flex justify-between mx-4 py-4">
                        <Button 
                            type="submit" 
                            onClick={onDisagreeClick}
                            variant="outline"
                        >
                            I DONT AGREE
                        </Button>
                        <Button 
                            type="submit"
                            className={`${disabledclass}`}
                            onClick={onAgreeClick}
                        >
                            CONTINUE
                        </Button>
                    </div>
                </div>
            </CardContent>
        </ScrollArea>
    </DialogContent>
</Dialog>
    )
}