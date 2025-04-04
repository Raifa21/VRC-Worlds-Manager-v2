'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import patreonData from '@/data/patreons.json';
import { UserProfile } from '@/components/user-profile';
import { ExternalLink, Heart } from 'lucide-react';
import { SiGithub, SiDiscord } from '@icons-pack/react-simple-icons';
import Image from 'next/image';

// Add member type
interface TeamMember {
  name: string;
  avatar: string;
  twitter?: string;
  github?: string;
}

export default function AboutPage() {
  // Sort names within their tier groups
  const platinumNames = patreonData.platinumSupporter.sort();
  const goldNames = patreonData.goldSupporter.sort();
  const silverNames = patreonData.silverSupporter.sort();
  const bronzeNames = patreonData.bronzeSupporter.sort();
  const basicNames = patreonData.basicSupporter.sort();

  // Combine in tier order
  const orderedSupporters = [
    ...platinumNames,
    ...goldNames,
    ...silverNames,
    ...bronzeNames,
    ...basicNames,
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex flex-row justify-center items-baseline gap-4 border-b pb-2">
        <h1 className="text-3xl font-bold">VRC World Manager</h1>
        <p className="text-muted-foreground text-sm translate-y-1">v.0.1.0</p>
      </div>

      <div className="flex flex-row gap-4">
        <div className="w-3/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Development Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-x-4 flex flex-row">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Developers
                </h3>
                <div className="space-x-4 flex flex-row">
                  <UserProfile
                    name="Raifa"
                    iconUrl=""
                    xUsername="raifa_trtr"
                    githubUsername="Raifa21"
                  />
                  <UserProfile
                    name="siloneco"
                    iconUrl=""
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
                    iconUrl=""
                    xUsername="Jan_kumaVRC"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <div>
            <CardHeader>
              <CardTitle>About the Project</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                VRC World Manager is an open-source project aimed at helping
                people manage their favorite worlds more effectively.
              </p>
            </CardContent>
          </div>
        </div>

        <div className="w-2/5">
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
              {orderedSupporters.map((name) => (
                <span
                  key={name}
                  className="px-3 py-1 bg-pink-500/10 text-pink-500 dark:text-pink-400 rounded-full text-sm font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          </CardContent>
        </div>
      </div>
      <div className="flex flex-row gap-4">
        <div className="w-1/2">
          <CardHeader>
            <CardTitle>Special Thanks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium mb-1">VRChat</h3>
                <p className="text-sm text-muted-foreground">
                  For providing the API that makes this project possible.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">
                  VRChat API Community
                </h3>
                <p className="text-sm text-muted-foreground">
                  For maintaining comprehensive API documentation and support.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">黒音キト</h3>
                <p className="text-sm text-muted-foreground">
                  For providing the Launchpad Icons.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Contributors</h3>
                <p className="text-sm text-muted-foreground">
                  Thanks to all the contributors who have helped improve this
                  project through feedback, bug reports, and suggestions.
                </p>
              </div>
            </div>
          </CardContent>
        </div>

        <div className="w-1/2">
          <CardHeader>
            <CardTitle>Project Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="w-full flex items-center gap-2"
                onClick={() =>
                  window.open(
                    'https://github.com/Raifa21/vrc-world-manager',
                    '_blank',
                  )
                }
              >
                <SiGithub className="h-4 w-4" />
                Source Code
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>
              <Button
                className="w-full flex items-center gap-2"
                onClick={() =>
                  window.open(
                    'https://github.com/Raifa21/vrc-world-manager/issues',
                    '_blank',
                  )
                }
              >
                <SiDiscord className="h-4 w-4" />
                Report an Issue
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}
