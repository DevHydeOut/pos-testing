# TODO: Fix Print Template Issues

## Issues to Resolve
1. **TypeScript Error in craft-components.tsx (Line 28)**: Fix the useEditor hook call in TextComponent, ImageComponent, DividerComponent, and Container to properly determine if the component is selected using useNode instead of incorrect useEditor selector.
2. **Edit Button Not Working**: Update the Edit button link in print-template/page.tsx to point to the correct edit route (/print-template/[id]/edit).

## Steps
- [x] Fix TypeScript error in src/components/print/craft-components.tsx by replacing useEditor with useNode for isActive/isSelected in all components.
- [x] Update Edit button href in src/app/print-template/page.tsx from `/print-template/${template.id}` to `/print-template/${template.id}/edit`.
- [x] Fix Create New Template button href to `/print-template/new/edit` to match the route handling in edit page.
- [x] Test the fixes: Run the app, check for no TypeScript errors, and verify edit button navigates to the edit page.
- [ ] If issues persist, check Craft.js version in package.json and ensure compatibility.
