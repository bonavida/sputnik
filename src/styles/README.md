# Styles folder structure

This folder structure is a variant of the [7-1 pattern](https://sass-guidelin.es/#architecture) (7 folders, 1 file), where basically you have all your partials stuffed into 7 different folders, and a single file at the root level (usually named main.scss) which imports them all to be compiled into a CSS stylesheet.

This project only uses 2 folders because I don't think that the missing folders are relevant at this point. These 2 folders and 1 file are:

- **Abstracts:** Handles functions, mixins and variables.
- **Base:** Animations, base, typography, and utilies.
- **main.scss:** Main global SASS file.
