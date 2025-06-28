"use client";

import { useState, useRef } from "react";

import Link from 'next/link';

import { useQueryClient } from '@tanstack/react-query'; 

import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";

import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Dropdown, DropdownSection } from "@/components/Dropdown";
import { PublicKeyDisplay } from "@/components/PublicKeyDisplay";

import { useClickOutside } from '@/hooks/useClickOutside';

import { Avatar } from "@/components/Avatar";

import styles from "./UserMenu.module.css";

export const UserMenu = () => {
    const { userPublicKey, altUsers, login, logout, setActiveUser, isAuthChecking  } = useAuth();
    const { altUserProfiles, isAltUserProfileSLoading, userProfile } = useUser();

    const queryClient = useQueryClient();

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const selectFloatingRef = useRef(null);

    const toggleDropdown = () => setIsOpen((prev) => !prev);
    const closeDropdown = () => setIsOpen(false);

    const handleUserSelect = (publicKey) => {
        // 🔥 Invalidate posts and single post cache for ALL users
        queryClient.invalidateQueries({ queryKey: ['user-posts'] });
        queryClient.invalidateQueries({ queryKey: ['single-post'] });
        queryClient.invalidateQueries({ queryKey: ['comments'] });

        // no need to invalidate since posts retured based by reader public key
        // queryClient.invalidateQueries({ queryKey: ['follow-feed-posts'] }); 

        setActiveUser(publicKey);
        closeDropdown();
    };

    const handleLogin = () => {
        login();
        closeDropdown();
    };

    const handleLogout = () => {
        // ✔️ This clears out old data when user logs out.
        queryClient.invalidateQueries({ queryKey: ['user-posts'] });
        queryClient.invalidateQueries({ queryKey: ['single-post'] });
        queryClient.invalidateQueries({ queryKey: ['comments'] });

        // no need to invalidate since posts retured based by reader public key
        // queryClient.invalidateQueries({ queryKey: ['follow-feed-posts'] }); 

        logout();
        closeDropdown();
    };

    useClickOutside([containerRef, selectFloatingRef], () => {
        closeDropdown();
    });   

    const selectOptions = [
        ...(userPublicKey
          ? [{
              value: userPublicKey,
              label: userProfile?.Username || userPublicKey,
              icon: <Avatar profile={userProfile} size={24} />,
            }]
          : []),
        ...(altUserProfiles?.length > 0
          ? altUserProfiles.map((user) => ({
              value: user.PublicKeyBase58Check,
              label: user.ProfileEntryResponse?.Username || user.PublicKeyBase58Check,
              icon: <Avatar profile={user.ProfileEntryResponse} size={24} />,
            }))
          : []),
    ];


  return (
    <div className={styles.container} ref={containerRef}>

        {/* If not loading, and no user + no alts → show login, otherwise → show avatar */}
        {!isAuthChecking && (
            Object.keys(altUsers)?.length === 0 && !userPublicKey ? (
                <Button size="small" onClick={handleLogin}>Log in</Button>
            ) : (
                <div className={styles.start} onClick={toggleDropdown}>
                    <Avatar profile={userProfile} size={38} />
                </div>
            )
        )}        

        {isOpen && (
            <Dropdown className={styles.dropdown}>

                {
                    userPublicKey &&
                    <DropdownSection>                    
                        <div className={styles.userCard}>
                            <Avatar profile={userProfile} size={60} />
                            <div className={styles.profileInfo}>
                                <div className={styles.profileDisplayName}>{userProfile?.ExtraData?.DisplayName}</div> 
                                <Link 
                                    href={`/${userProfile?.Username || userPublicKey}`} 
                                    className={styles.profileUsername}
                                    onClick={closeDropdown}
                                >
                                    {
                                        userProfile?.Username
                                        ?<>@{userProfile?.Username}</>
                                        :<>{userPublicKey}</>
                                    }
                                </Link>                             
                            </div>
                        </div>
                    </DropdownSection>                    
                }

                {userPublicKey && 
                    <DropdownSection>
                        <div className={styles.quickLinks}>
                            <Link href={`/${userProfile?.Username || userPublicKey}/posts`} className={styles.quickLink} onClick={closeDropdown}>
                                📝 User Posts
                            </Link>
                            <Link href={`/${userProfile?.Username || userPublicKey}/feed`} className={styles.quickLink} onClick={closeDropdown}>
                                🙂 Follow Feed
                            </Link>
                            <Link href={`/${userProfile?.Username || userPublicKey}/notifications`} className={styles.quickLink} onClick={closeDropdown}>   
                                🔔 Notifications   
                            </Link>
                        </div>
                    </DropdownSection>
                }


                {
                    userPublicKey &&
                    <DropdownSection label="Public Key">                    
                        <PublicKeyDisplay value={userPublicKey} align="end" charsStart={8} charsEnd={8} />
                    </DropdownSection>                    
                }

                {
                    selectOptions && selectOptions.length > 0 &&
                    <DropdownSection label="Switch user">
                        <div className={styles.altUserSelector}>
                            <div>
                            {isAltUserProfileSLoading
                                ?<span>Loading...</span>
                                :   
                                <Select
                                    floatingRef={selectFloatingRef}
                                    value={userPublicKey}
                                    onChange={(e) => handleUserSelect(e.target.value)}
                                    placeholder="Select alternate user"
                                    options={selectOptions}
                                    maxHeight="200px"
                                />                                              
                            }       
                            </div>
                            <div><Button onClick={handleLogin} variant="secondary" size="small">Add User</Button></div>          
                        </div>      
                    </DropdownSection>                       
                }      

                <DropdownSection>
                    {userPublicKey ? (
                        <Button onClick={handleLogout}>Log out</Button>
                    ) : (
                        <Button onClick={handleLogin}>Log in</Button>
                    )}
                </DropdownSection>
            </Dropdown>
        )}
    </div>
  );
};
