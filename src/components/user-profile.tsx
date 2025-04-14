/**
 * MIT License
 *
 * Copyright (c) 2025 siloneco and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SiGithub, SiX } from '@icons-pack/react-simple-icons';
import { FC } from 'react';

type Props = {
  name: string;
  iconUrl: string;

  xUsername?: string;
  githubUsername?: string;
};

export const UserProfile: FC<Props> = ({
  name,
  iconUrl,
  xUsername,
  githubUsername,
}) => {
  return (
    <div className="flex flex-row items-center space-x-4">
      <Avatar>
        <AvatarImage src={iconUrl} alt={name} />
        <AvatarFallback>{name}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <p>{name}</p>
        <div className="flex flex-row space-x-2">
          {xUsername && (
            <a
              href={`https://x.com/${xUsername}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SiX size={20} />
            </a>
          )}
          {githubUsername && (
            <a
              href={`https://github.com/${githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SiGithub size={20} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
