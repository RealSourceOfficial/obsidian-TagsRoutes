# Obsidian plugin: TagsRoutes
<div align="left">
<img alt="GitHub Release" src="https://img.shields.io/github/downloads/kctekn/obsidian-TagsRoutes/total?logo=github&&color=%23a8baff">
<img alt="GitHub Release" src="https://img.shields.io/github/v/release/kctekn/obsidian-TagsRoutes?color=%23a8baff">
</div>

This is a plugin for obsidian, to visualize files and tags as nodes in 3D graphic.

<img width="40%" src="https://github.com/user-attachments/assets/27d000e5-fc97-4b53-ac6f-a5ed9a14aea0">

Wiki: [Organize Tags by Timestamp Using the Obsidian Plugin: "Tags Routes"](https://github.com/kctekn/obsidian-TagsRoutes/wiki/Organize-Tags-by-Timestamp-Using-the-Obsidian-Plugin:-%22Tags-Routes%22)

[Organize Tags with Hierarchy Using the Obsidian Plugin "Tags Routes"](https://github.com/kctekn/obsidian-TagsRoutes/wiki/Organize-Tags-with-Hierarchy-Using-the-Obsidian-Plugin-%22Tags-Routes%22)
## Version 1.0.9/1.0.10 Release Notes:

1. **Support for Named Color Input**: Added support for named color input, making it easier to select the perfect color.
2. **Frontmatter Tags as Individual Tags**: Tags in the frontmatter are now treated as individual tags, separate from the tags in the note content.
3. **File List Report Generation**: You can now generate a report of files associated with a tag by clicking on a frontmatter tag.
4. **Colorful Node Name Display**: Node names now display in color by default, not just when hovered over.
5. **Other Improvements**:
   1. Updated the plugin icon.
   2. Added a new general settings option to toggle whether the graph opens in the current tab.
   3. Introduced a reset color button in the color settings section.

Many updates is according to https://github.com/kctekn/obsidian-TagsRoutes/discussions/9, thanks to @jeceey for the creative suggestions.



**Feature**

<img width="20%" src="https://github.com/kctekn/obsidian-TagsRoutes/blob/main/usage/v109-update.gif">

**Usage Demo**

<img width="50%" src="https://github.com/kctekn/obsidian-TagsRoutes/blob/main/usage/setup-color-v109.gif">


## Version 1.0.8 - Release Notes
Fixed a parsing tag issue: if the tag in frontmatter is wrote in a single line, it will meet error during plugin startup.

refer to https://github.com/kctekn/obsidian-TagsRoutes/issues/10 for detail

## Version 1.0.7 Release Notes
**1. Enhanced Tag Processing**
- Tags in the note's frontmatter are now processed identically to tags within the note content, ensuring consistent tag handling throughout.

**2. Comprehensive Color Customization**
- Introduced full color customization for nodes, links, and particles via the plugin settings tab.
- Implemented a color scheme slot system, allowing users to:
  - Save multiple color schemes to different slots.
  - Easily switch between color schemes with a simple drag on the slider.
  - Set unique color schemes for each slot, enhancing visual customization.

 _**Watch this short demo to learn how to use these new features:**_
 
 **Setup Color**
 
<img width="50%" src="https://github.com/kctekn/obsidian-TagsRoutes/blob/main/usage/setup-color.gif">

**Switch Settings**

<img width="50%" src="https://github.com/kctekn/obsidian-TagsRoutes/blob/main/usage/switch-settings.gif">

## Version 1.0.6 Release Notes

This release brings two key improvements to enhance your user experience:

**1. Focused Node View:**

- You can now toggle between a global and local view while focusing on a specific node.
- **Local view:**  Hides non-focused nodes, allowing you to concentrate on the selected node and its immediate connections. This declutters the scene and provides a clearer picture of the focused area.
- **Global view:** Displays all nodes as usual.
-  Switch between these views easily to analyze your data from different perspectives.

**2. Streamlined Interface:**

- The settings icon in the top right corner has been replaced with a more intuitive cycling button. 
- Click the button repeatedly to cycle through four different stages or functionalities. This change simplifies the interface and reduces visual clutter.


These updates aim to provide a more focused and efficient user experience. We hope you enjoy the improvements!


 _**Watch this short demo to learn how to use these new features:**_ 
 
<img width="50%" src="https://github.com/kctekn/obsidian-TagsRoutes/blob/main/usage/node-highlight.gif">


## What's New on version 1.0.5

1. **Multiple Slots for Display Settings**
   - You now have 5 slots to save your display settings. This allows you to quickly switch between them by dragging the slider.
     - So it likes that you have 5 themes to switch for better showing the graph in instance.
2. **Improved Query Function**
   - The query function is now handled by a custom code block processor, eliminating the need for DataviewJS.
     - You can now delete the `scripts/tag-report.js` file and the `scripts` folder from your vault.

3. **Enhanced Tag Interaction**
   - Clicking on a tag to focus on a node in the graph now works in edit mode as well.

4. **Other Fixes**
   - Fix a ficker issue might occure, Refer here: https://github.com/kctekn/obsidian-TagsRoutes/issues/2  Thanks @ShaneNZ for the feecback.

# How to operate:
https://github.com/kctekn/obsidian-TagsRoutes/assets/32674595/2c37676c-f307-4a74-9dae-0679067cbae7



https://github.com/kctekn/obsidian-TagsRoutes/assets/32674595/759e9cba-c729-4b3e-a0c4-bb4c4f1b5dd1






This plugin provides a comprehensive graph view to visualize the relationships between files, file-tag connections, and inter-tag connections within Obsidian. **It is particularly useful for users who manage extensive thoughts and ideas with numerous tags in Obsidian.**

# Features: 
 
- **Node and Link Visualization** :
  - Display all files and their links.
 
  - Display all tags and their connections, including:
    - Tag-to-tag links

    - Tag-to-file links

    - File-to-file links
 
- **Dynamic Node Sizing** :
  - Adjust the size of file nodes based on the number of links.

  - Adjust the size of tag nodes based on their frequency of appearance.

This approach helps you identify the most significant parts of your vault at a glance.

# Additional Functionalities: 
 
- **Orphan File Linking** : 
  - Connect all orphan files, making them easier to review. Note that orphan files are not necessarily useless but are:
    - Non-markdown files with no links to other files.

    - For example, they could be isolated images from copy/paste operations or various collected items.
 
- **Orphan Excalidraw File Linking** :
  - Connect all orphan Excalidraw files that are not linked by any markdown files, simplifying their review.

# Interactive Features: 
 
- **Node Interaction** :
  - Click on a file node to open it in the editor, regardless of its file type.
 
  - Click on a tag node to generate a query result for that tag, displayed in a file in the editor.
    - Provides a clear view of the tag's content by capturing the surrounding lines until a blank line is encountered, showing the entire paragraph containing the tag.
 
- **Graph Focus** :
  - Clicking on any file to open it in the editor will automatically focus the graph on its node.

  - Clicking on a tag in Obsidian's "Reading Mode" will focus on the tag node in the graph.

This allows you to clearly understand the status of files and tags through:

- The file’s link status

- The tags contained within the file

# Adjustable Settings: 

- Focus distance on a node

- Toggle tag query result page

- Toggle log page
 
- Display styles:
  - Link distance and width
  - Link particle size, number, and color
  - Node size and repulsion


# Install
- Search for "Tags routes" in Obsidian's community plugins browser, or you can find it [HERE](https://obsidian.md/plugins?search=tags%20routes).
- Choose to intall it.
- You can also install it manually:
	- Download the release file, and extract to your obsidian's: valut/.obsidian/plugin/tags-routes.
- Enable it in obsidian settings tab.

# Acknowledgements

I would like to extend my sincere gratitude to the following projects, which provided invaluable resources and inspiration for this plugin:

- [obsidian-3d-graph](https://github.com/AlexW00/obsidian-3d-graph/tree/master) by AlexW00
- [3d-force-graph](https://github.com/vasturiano/3d-force-graph) by vasturiano
