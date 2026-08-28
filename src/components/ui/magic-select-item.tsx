'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { useCallback, useRef } from 'react';

import { cn } from '@/lib/utils';

function useMagicHover(gradientSize: number) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    },
    [mouseX, mouseY],
  );

  const onMouseLeave = useCallback(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [mouseX, mouseY, gradientSize]);

  return { ref, mouseX, mouseY, onMouseMove, onMouseLeave };
}

interface MagicSelectItemProps {
  children: React.ReactNode;
  className?: string;
  value: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicSelectItem({
  children,
  className,
  value,
  gradientSize = 200,
  gradientColor = '#00b7ff',
  gradientOpacity = 0.2,
  gradientFrom = '#7f51ff',
  gradientTo = '#ff368a',
}: MagicSelectItemProps) {
  const { ref, mouseX, mouseY, onMouseMove, onMouseLeave } = useMagicHover(gradientSize);

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        'group relative isolate flex w-full cursor-default select-none items-center overflow-hidden rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
    >
      {/* Fill gradient — kept OUTSIDE ItemText so it never gets mirrored into the trigger */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
          `,
          opacity: gradientOpacity,
        }}
      />

      {/* Border/edge gradient — same gradientOpacity applied, otherwise this
          fully opaque layer sits on top of the fill layer and masks any
          change made to gradientOpacity above. */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-sm"
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
              ${gradientFrom},
              ${gradientTo},
              transparent 100%
            )
          `,
          opacity: gradientOpacity,
        }}
      />

      {/* Only this gets mirrored into SelectValue when this item is selected.
          z-30 keeps it above both gradient layers (z-0) no matter what else
          renders inside the item (e.g. a check icon with no z-index of its own). */}
      <SelectPrimitive.ItemText className="relative z-30">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}