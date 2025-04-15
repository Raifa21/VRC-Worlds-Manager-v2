'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { UserProfile } from '@/components/user-profile';
import { ExternalLink, Heart } from 'lucide-react';
import { SiGithub, SiDiscord } from '@icons-pack/react-simple-icons';
import { useToast } from '@/hooks/use-toast';
import { commands } from '@/lib/bindings';

export function AboutSection() {
  const [orderedSupporters, setOrderedSupporters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPatreonData() {
      try {
        const result = await commands.fetchPatreonData();
        if (result.status === 'ok') {
          setOrderedSupporters(sortSupporters(result.data));
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Failed to fetch supporter data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load supporter data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatreonData();
  }, [toast]);

  // Helper function to sort supporters
  const sortSupporters = (data: any) => {
    const platinumNames = (data.platinumSupporter || []).sort();
    const goldNames = (data.goldSupporter || []).sort();
    const silverNames = (data.silverSupporter || []).sort();
    const bronzeNames = (data.bronzeSupporter || []).sort();
    const basicNames = (data.basicSupporter || []).sort();

    return [
      ...platinumNames,
      ...goldNames,
      ...silverNames,
      ...bronzeNames,
      ...basicNames,
    ];
  };

  return (
    <div className="container mx-auto relative pb-8">
      <div className="flex flex-row mb-2">
        {/* Development Team Section */}
        <div>
          <CardHeader>
            <CardTitle>Development Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Developers
                </h3>
                <div className="space-x-4 flex flex-row">
                  <UserProfile
                    name="Raifa"
                    iconUrl="https://data.raifaworks.com/icons/raifa.jpg"
                    xUsername="raifa_trtr"
                    githubUsername="Raifa21"
                  />
                  <UserProfile
                    name="siloneco"
                    iconUrl="https://data.raifaworks.com/icons/siloneco.jpg"
                    xUsername="siloneco_vrc"
                    githubUsername="siloneco"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Media Design
                </h3>
                <div className="space-x-4 flex flex-row">
                  <UserProfile
                    name="じゃんくま"
                    iconUrl="https://data.raifaworks.com/icons/jan_kuma.jpg"
                    xUsername="Jan_kumaVRC"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </div>
        {/* Special Thanks Section */}
        <div>
          <CardHeader>
            <CardTitle>Special Thanks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">VRChat</span>
                <span className="text-sm text-muted-foreground">
                  For the API and the platform.
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  VRChat API Community
                </span>
                <span className="text-sm text-muted-foreground">
                  For maintaing the API documentation.
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">黒音キト</span>
                <span className="text-sm text-muted-foreground">
                  For Launchpad Icons.
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </div>

      {/* Supporters Section */}
      <div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Supporters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Thank you to all the wonderful people who support this project!
            Support me{' '}
            <a
              href="https://raifa.fanbox.cc/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-500 hover:underline"
            >
              here
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              <span className="text-muted-foreground">
                Loading supporters...
              </span>
            ) : orderedSupporters.length > 0 ? (
              orderedSupporters.map((name) => (
                <span
                  key={name}
                  className="px-1 py-1 text-pink-500 dark:text-pink-400 rounded-full text-sm font-medium"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">No supporters found</span>
            )}
          </div>
        </CardContent>
      </div>

      {/* Bottom Bar - Changed from fixed to absolute positioning */}
      <div className="absolute bottom-0 inset-x-0 pl-4 pr-4 border-t items-center bg-background/80 backdrop-blur-sm flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          VRC Worlds Manager v.0.1.3a
        </div>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() =>
              window.open(
                'https://github.com/Raifa21/vrc-world-manager',
                '_blank',
              )
            }
          >
            <SiGithub className="h-4 w-4" />
            Source Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() =>
              window.open(
                'https://github.com/Raifa21/vrc-world-manager/issues',
                '_blank',
              )
            }
          >
            <SiDiscord className="h-4 w-4" />
            Report an Issue
          </Button>
        </div>
      </div>
    </div>
  );
}
