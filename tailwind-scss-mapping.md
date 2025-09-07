# Tailwind CSS Mapping for \_onboarding.scss

## Quick Reference Guide

### Root Container (.onboarding-page)

**SCSS Properties:**

- `grid-auto-flow: column` (desktop only via @include breakpoint-up(lg))
- Implicit grid display

**Tailwind Utilities:**

```
grid lg:grid-flow-col min-h-screen
```

### Main Column (main)

**SCSS Properties:**

- Child elements: `border: 0`
- Header:
  - Mobile: `row-gap: $header-padding-y + $body-padding-mobile` and `padding-top: $body-padding-mobile`
  - Desktop (lg+): `row-gap: $body-padding-desktop`, `padding-top: $body-padding-desktop`, `padding-bottom: 0`

**Tailwind Utilities:**

```
main: w-full max-w-lg mx-auto px-4 lg:px-6 pt-4 lg:pt-8
main > header: grid gap-4 lg:gap-8
```

### Aside Column (aside)

**SCSS Properties:**

- Mobile: `display: none`
- Desktop (lg+): `display: grid`, `position: relative`
- Child image: `position: absolute`, `top: 0`, `left: 0`, `height: 100%`, `width: 100%`, `object-fit: cover`

**Tailwind Utilities:**

```
aside: hidden lg:block relative flex-1
aside > img:only-child: absolute inset-0 h-full w-full object-cover
```

### Logo (.logo-full)

**SCSS Properties:**

- `grid-column: 1`

**Tailwind Notes:**

- Keep `.logo-full` anchor untouched (has sprite styles elsewhere)
- No Tailwind conversion needed for this class

### Actions (.actions)

**SCSS Properties:**

- `grid-column: 2`

**Tailwind Utilities:**

```
col-start-2
```

### Heading (h1)

**SCSS Properties:**

- `white-space: initial`
- `grid-column: 1/-1` (span full width)

**Tailwind Utilities:**

```
whitespace-normal col-span-full
```

## Complete Mapping Summary

| SCSS Selector            | SCSS Properties                    | Tailwind Utilities                                  |
| ------------------------ | ---------------------------------- | --------------------------------------------------- |
| `.onboarding-page`       | `grid-auto-flow: column` (lg+)     | `grid lg:grid-flow-col min-h-screen`                |
| `main`                   | Container styles                   | `w-full max-w-lg mx-auto px-4 lg:px-6 pt-4 lg:pt-8` |
| `main > header`          | Grid gap and padding               | `grid gap-4 lg:gap-8`                               |
| `aside`                  | Hidden on mobile, grid on desktop  | `hidden lg:block relative flex-1`                   |
| `aside > img:only-child` | Full coverage absolute positioning | `absolute inset-0 h-full w-full object-cover`       |
| `.logo-full`             | Grid column 1                      | Keep existing (sprite styles)                       |
| `.actions`               | Grid column 2                      | `col-start-2`                                       |
| `h1`                     | Whitespace and full span           | `whitespace-normal col-span-full`                   |

## Implementation Notes

1. **Mobile-First Approach**: The layout is single column on mobile, switching to two-column grid on large screens (lg breakpoint)

2. **Main Column Constraints**: The main content has a max width of `max-w-lg` and is centered with `mx-auto`

3. **Responsive Padding**: Different padding values for mobile (`px-4 pt-4`) vs desktop (`lg:px-6 lg:pt-8`)

4. **Aside Visibility**: The aside is completely hidden on mobile and only appears on large screens as a flexible container

5. **Image Positioning**: The image inside aside uses absolute positioning with `inset-0` for full coverage

6. **Grid Structure**: The parent container uses CSS Grid with automatic column flow on desktop screens
