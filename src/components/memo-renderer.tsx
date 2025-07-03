import { FC, Fragment } from 'react';

const URL_REGEX = /https?:\/\/[^\s]+/g;

type Props = {
  value: string;
};

export const MemoRenderer: FC<Props> = ({ value }) => {
  return (
    <pre className="whitespace-pre-wrap break-words font-sans h-full max-w-[700px] text-sm">
      {value.split('\n').map((line, index) => {
        let buffer: string[] = [];

        return (
          <p className="space-x-1" key={`${line}-${index}`}>
            {line.split(' ').map((text, index) => {
              if (URL_REGEX.test(text)) {
                const linkComponent = (
                  <a
                    key={`url-${text}-${index}`}
                    href={text}
                    className="text-blue-600 dark:text-blue-400 underline"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {text}
                  </a>
                );

                if (buffer.length <= 0) {
                  return linkComponent;
                }

                const bufferedText = buffer.join(' ');
                buffer = [];

                return (
                  <span key={`text-url-${index}`} className="space-x-1">
                    <span>{bufferedText}</span>
                    {linkComponent}
                  </span>
                );
              }

              buffer = [...buffer, text];

              return <Fragment key={`empty-${index}`}></Fragment>;
            })}
            {buffer.length > 0 && (
              <span key={`buffer-${line}-${index}`}>{buffer.join(' ')}</span>
            )}
          </p>
        );
      })}
    </pre>
  );
};

export default MemoRenderer;
