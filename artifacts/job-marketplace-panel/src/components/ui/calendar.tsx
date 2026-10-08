'use client';

import * as React from 'react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'group/calendar rounded-xl bg-white p-3 text-[#334155] [--cell-size:2.25rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'long' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months,
        ),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          captionLayout === 'dropdown'
            ? 'hidden'
            : 'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-9 w-9 select-none rounded-lg p-0 text-[#475569] hover:bg-[#eff6ff] hover:text-[#1d4ed8] aria-disabled:opacity-40',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-9 w-9 select-none rounded-lg p-0 text-[#475569] hover:bg-[#eff6ff] hover:text-[#1d4ed8] aria-disabled:opacity-40',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          captionLayout === 'dropdown'
            ? 'flex min-h-10 w-full items-center justify-center'
            : 'flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex w-full items-center justify-center gap-2 text-sm font-semibold',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative inline-flex h-9 items-center rounded-lg border border-[#dbe4f2] bg-[#f8fbff] px-2.5 text-sm font-semibold text-[#172554] shadow-sm transition-colors hover:border-[#bfd1ef] has-focus:border-[#2563eb] has-focus:ring-4 has-focus:ring-[#dbeafe]',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute inset-0 h-full w-full cursor-pointer opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : '[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex border-b border-[#eef2f8] pb-1', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none rounded-md text-[0.7rem] font-semibold uppercase tracking-wide text-[#94a3b8]',
          defaultClassNames.weekday,
        ),
        week: cn('mt-1.5 flex w-full', defaultClassNames.week),
        week_number_header: cn(
          'w-[--cell-size] select-none',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-muted-foreground select-none text-[0.8rem]',
          defaultClassNames.week_number,
        ),
        day: cn(
          'group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md',
          defaultClassNames.day,
        ),
        range_start: cn(
          'bg-accent rounded-l-md',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('bg-accent rounded-r-md', defaultClassNames.range_end),
        today: cn(
          'rounded-lg bg-[#eff6ff] font-semibold text-[#1d4ed8] data-[selected=true]:rounded-lg',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-[#cbd5e1] aria-selected:text-[#cbd5e1]',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'cursor-not-allowed text-[#cbd5e1] opacity-60',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            );
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 rounded-lg font-normal leading-none text-[#334155] transition-colors hover:bg-[#eff6ff] hover:text-[#1d4ed8] data-[selected-single=true]:bg-[#2563eb] data-[selected-single=true]:font-semibold data-[selected-single=true]:text-white data-[range-middle=true]:bg-[#eff6ff] data-[range-middle=true]:text-[#1d4ed8] data-[range-start=true]:rounded-lg data-[range-start=true]:bg-[#2563eb] data-[range-start=true]:text-white data-[range-end=true]:rounded-lg data-[range-end=true]:bg-[#2563eb] data-[range-end=true]:text-white group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-[#93c5fd] [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
