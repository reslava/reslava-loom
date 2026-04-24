# CHAT

## Rafa:
We need to test, fix and tweak vscode extension until implement fully feature workflow and have a confortable and intuitive UX.
- Design: `weaves/vscode-extension/vscode-extension/vscode-extension-design.md` we will refine the design if need appending new design concepts we implement
- Plan: `weaves/vscode-extension/vscode-extension/plans/vscode-extension-plan-008.md` we will append here all fixes, tweaks we implement.

### Empty weaves and threads
User should be able to create empty weaves and threads as he wish. For example, at the beginning of project he has clear architecture in mind and start by createing weaves:
- core, fs, app, cli, vscode
- and then create some empty threads in some weaves
- and then start creating chat, ideas, designs
What you think?

### Weave 
- toolbar: create

### Thread
- toolbar: create. If a weave or weave child is selected create it inside. If not weave or weave child selected hide button

### Chats
- chats folder name is `chats` and they should line in
  - {weave}/chats/
  - {weave}/{thread}/chats/
- if a thread of a doc of a thread is selected when he create a chat assign to thread, same for weave, if nothing is selected we could hide chat toolbar creation button

### All docs type and weaves, threads
- inline button: rename, delete, archive

settings.json workflow.user.name -> loom.user.name
