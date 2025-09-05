# CSS Architecture Documentation

## Overview

This directory contains a well-organized CSS system with centralized design tokens and modular architecture. The system follows the **Single Source of Truth** principle and provides consistent styling across the entire application.

## File Structure

```
src/styles/
├── README.md              # This documentation
├── color-palette.css      # Color definitions and brand colors
├── typography.css         # Font families, sizes, weights, line heights
├── spacing.css           # Spacing scale, border radius, z-index
├── effects.css           # Shadows, blur, transitions, animations
├── layout-variables.css  # Layout dimensions, breakpoints, resizer config
├── main.css             # Application-specific styles and components
├── chat-message.css     # Chat message component styles
└── feature-components.css # Feature-specific component styles
```
# LS:

!- Alle Farben sollen in der Datei @src/styles/color-palette.css definiert werden.


## Design Token Categories

### 1. **Color Palette** (`color-palette.css`)
**Purpose**: Centralized color definitions and brand identity
- **Brand Colors**: Primary, secondary, accent colors
- **Functional Colors**: Success, warning, error, info states
- **Text Colors**: Primary, secondary, tertiary text colors
- **Background Colors**: Primary, secondary, tertiary backgrounds
- **Surface Colors**: Glass effects and overlays
- **Gradients**: Brand and functional gradients
- **Border Colors**: Light, dark, primary borders
- **Shadow Colors**: Various shadow color definitions
- **Interactive States**: Hover, active, focus states
- **Highlighting Colors**: 3D element highlighting
- **Resize Handle Colors**: Resizer-specific colors
- **BIM Viewer Colors**: BIM-specific color tokens
- **Chat Message Colors**: Chat-specific color tokens
- **Badge Colors**: Badge component colors

### 2. **Typography** (`typography.css`)
**Purpose**: Font definitions and text styling
- **Font Families**: Sans-serif and monospace fonts
- **Font Sizes**: Complete size scale (xs to 4xl)
- **Line Heights**: Normal and tight line heights
- **Font Weights**: Normal, medium, semibold, bold
- **Typography Classes**: Body, headings, code styles
- **Chat Typography**: Chat-specific font sizes
- **Utility Classes**: Text size, weight, family utilities

### 3. **Spacing & Layout** (`spacing.css`)
**Purpose**: Spacing scale and layout dimensions
- **Spacing Scale**: Complete spacing scale (xs to 3xl)
- **Border Radius**: Radius scale and utilities
- **Z-Index Scale**: Layering system
- **BIM Spacing**: BIM-specific spacing tokens
- **BIM Radius**: BIM-specific border radius
- **BIM Z-Index**: BIM-specific layering
- **Utility Classes**: Margin, padding, gap utilities

### 4. **Effects** (`effects.css`)
**Purpose**: Visual effects and animations
- **Shadows**: Complete shadow scale
- **Blur Effects**: Backdrop blur utilities
- **Transitions**: Transition timing and easing
- **BIM Effects**: BIM-specific shadows and blur
- **Glass Effects**: Glass morphism utilities
- **Hover Effects**: Interactive hover states
- **Focus Effects**: Accessibility focus rings
- **Animations**: Keyframe animations and utilities

### 5. **Layout Variables** (`layout-variables.css`)
**Purpose**: Layout configuration and responsive design
- **Bento Layout**: Header, content, input proportions
- **Resizer Dimensions**: Width, height, z-index
- **Resizer Colors**: Background, border, hover states
- **Resizer Limits**: Min/max values for resizers
- **BIM Container**: Container dimensions and effects
- **Responsive Breakpoints**: Consistent breakpoint system
- **Layout Dimensions**: Footer height and other dimensions
- **Chat Message Layout**: Chat-specific layout tokens

### 6. **Main Styles** (`main.css`)
**Purpose**: Application-specific component styles
- **App Layout**: Main application structure
- **Footer Styles**: Modern footer design
- **Bento Layout**: Bento box layout system
- **Header Components**: Header styling
- **Button System**: Bento button variants
- **Chat Components**: Chat input and content
- **BIM Viewer**: 3D viewer styling
- **Resizable Layout**: Interactive resizing system

### 7. **Chat Message** (`chat-message.css`)
**Purpose**: Dedicated chat message styling
- **Message Layout**: Message positioning and structure
- **Message Content**: Content styling and bubbles
- **Message Header**: Role and metadata display
- **Message Metadata**: Timestamps and processing info
- **Responsive Design**: Mobile-specific adjustments

### 8. **Feature Components** (`feature-components.css`)
**Purpose**: Feature-specific component styles
- **Chat Components**: Input, messages, quick tips styling
- **AI Components**: Pipeline, loading, error states
- **Responsive Design**: Mobile-specific adjustments
- **Accessibility**: Focus states and keyboard navigation
- **Animations**: Smooth transitions and micro-interactions

## Import Order

The CSS files are imported in a specific order to ensure proper cascade:

```css
/* 1. Typography (fonts, sizes, weights) */
@import '@/styles/typography.css';

/* 2. Spacing (spacing scale, radius, z-index) */
@import '@/styles/spacing.css';

/* 3. Effects (shadows, blur, transitions) */
@import '@/styles/effects.css';

/* 4. Layout (dimensions, breakpoints) */
@import '@/styles/layout-variables.css';

/* 5. Colors (all color definitions) */
@import '@/styles/color-palette.css';

/* 6. Main styles (component styles) */
@import '@/styles/main.css';

/* 7. Feature-specific styles */
@import '@/styles/chat-message.css';
@import '@/styles/feature-components.css';
```

## Design Token Organization

### **Color System**
```css
/* Brand Colors */
--color-primary: [Primary brand color];
--color-secondary: [Secondary brand color];
--color-accent: [Accent color];

/* Functional Colors */
--color-success: [Success state color];
--color-warning: [Warning state color];
--color-error: [Error state color];
--color-info: [Info state color];

/* Text Colors */
--text-primary: [Primary text color];
--text-secondary: [Secondary text color];
--text-white: [White text color];
```

### **Spacing System**
```css
/* Spacing Scale */
--spacing-xs: [Extra small spacing];
--spacing-sm: [Small spacing];
--spacing-md: [Medium spacing];
--spacing-lg: [Large spacing];
--spacing-xl: [Extra large spacing];
```

### **Typography System**
```css
/* Font Sizes */
--font-size-xs: [Extra small text];
--font-size-sm: [Small text];
--font-size-base: [Base text size];
--font-size-lg: [Large text];
```

### **Effects System**
```css
/* Shadows */
--shadow-sm: [Small shadow];
--shadow-md: [Medium shadow];
--shadow-lg: [Large shadow];

/* Transitions */
--transition-fast: [Fast transition timing];
--transition-normal: [Normal transition timing];
--transition-slow: [Slow transition timing];
```

## Best Practices

### **1. Use Design Tokens**
```css
/* ✅ Good - Use design tokens */
.button {
  padding: var(--spacing-md);
  border-radius: var(--radius-standard);
  background: var(--color-primary);
  box-shadow: var(--shadow-md);
}

/* ❌ Bad - Hardcoded values */
.button {
  padding: [hardcoded spacing];
  border-radius: [hardcoded radius];
  background: [hardcoded color];
  box-shadow: [hardcoded shadow];
}
```

### **2. Consistent Naming**
```css
/* ✅ Good - Consistent naming */
--color-primary: [primary color];
--color-primary-dark: [darker variant];
--color-primary-light: [lighter variant];

/* ❌ Bad - Inconsistent naming */
--primary: [primary color];
--primaryDark: [darker variant];
--primaryLight: [lighter variant];
```

### **3. Semantic Color Usage**
```css
/* ✅ Good - Semantic color usage */
.success-message {
  color: var(--color-success);
  background: var(--bg-success);
}

/* ❌ Bad - Direct color usage */
.success-message {
  color: #4ade80;
  background: #f0fdf4;
}
```

## Extension Guidelines

### **Adding New Colors**
1. Add to appropriate section in `color-palette.css`
2. Include light/dark variants if needed
3. Add utility classes if frequently used
4. Update documentation

### **Adding New Spacing**
1. Add to spacing scale in `spacing.css`
2. Include corresponding utility classes
3. Consider responsive variants
4. Update component usage

### **Adding New Effects**
1. Add to appropriate section in `effects.css`
2. Include utility classes
3. Consider animation variants
4. Test across browsers

### **Adding New Components**
1. Use existing design tokens
2. Create component-specific styles in `main.css`
3. Follow naming conventions
4. Include responsive design

## Maintenance

### **Regular Tasks**
- **Audit**: Review unused design tokens monthly
- **Optimize**: Remove duplicate or conflicting styles
- **Update**: Keep design tokens in sync with design system
- **Test**: Verify styles across different browsers and devices

### **Performance Optimization**
- **Tree Shaking**: Remove unused CSS classes
- **Minification**: Compress CSS for production
- **Caching**: Implement proper CSS caching strategies
- **Loading**: Optimize CSS loading order

## Troubleshooting

### **Common Issues**

1. **CSS Variables Not Working**
   - Check import order in `globals.css`
   - Verify variable names match exactly
   - Ensure variables are defined in `:root`

2. **Conflicting Styles**
   - Check specificity hierarchy
   - Review import order
   - Use more specific selectors if needed

3. **Responsive Issues**
   - Verify breakpoint definitions
   - Check media query syntax
   - Test on actual devices

4. **Performance Issues**
   - Audit unused CSS
   - Optimize selectors
   - Consider CSS-in-JS for dynamic styles

## Future Enhancements

1. **CSS Custom Properties**: Enhanced variable system
2. **CSS Modules**: Component-scoped styles
3. **PostCSS Plugins**: Advanced processing
4. **Design System**: Automated token generation
5. **Dark Mode**: Comprehensive dark theme support 