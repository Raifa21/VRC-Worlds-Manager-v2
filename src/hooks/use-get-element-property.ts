/*
 * This file is adapted from the KonoAsset project
 * https://github.com/siloneco/KonoAsset
 * Copyright (c) 2025 siloneco and other contributors
 *
 * That file was originally derived from https://zenn.dev/tm35/articles/7ac0a932c15ef8
 *
 * Further modifications by @Raifa21
 */
import { RefObject, useCallback } from 'react';

// 引数のtargetProperty をDOMRectのもつPropertyに限定する
type DOMRectProperty = keyof Omit<DOMRect, 'toJSON'>;

// RefObjectの型は div, span, p, input などのさまざまなHTML要素に対応できるようにextendsで制限をかけつつ抽象化
export const useGetElementProperty = <T extends HTMLElement | null>(
  elementRef: RefObject<T>,
) => {
  const getElementProperty = useCallback(
    (targetProperty: DOMRectProperty): number => {
      const clientRect = elementRef.current?.getBoundingClientRect();
      if (clientRect) {
        return clientRect[targetProperty];
      }

      // clientRect が undefined のときはデフォルトで0を返すようにする
      return 0;
    },
    [elementRef],
  );

  return {
    getElementProperty,
  };
};
