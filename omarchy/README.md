# Omarchy desktop config

Linux-only. macOS ignores this whole directory — `script/setup` gates it on
`$LINUX` and on the directory existing.

## What is linked, and what deliberately is not

| Path | Install | Why |
| --- | --- | --- |
| `hypr/bindings.lua` | symlink | User-override file. The one migration that touches it is SHA-gated and uses `cp`, which writes *through* a symlink. |
| `hypr/looknfeel.lua` | symlink | No migration references it. |
| `hypr/input.lua` | symlink | One SHA-gated migration, `cp` again. |
| `hypr/autostart.lua` | symlink | No migration references it. |
| `hypr/monitors.lua` | symlink | No migration references it. Carries a QEMU/virgl block the installer seeded, gated on the kernel cmdline — it self-disables on any machine that is not that VM. |
| `hypr/hyprland.lua` | **not tracked** | The entrypoint. Holds no personal config, and three migrations rewrite it with `mv`, which replaces a symlink with a real file and orphans the repo copy. |
| `hypr/hyprsunset.conf`, `hypr/xdph.conf`, `.luarc.json` | **not tracked** | Still byte-identical to what Omarchy ships. Add them the day they carry a real preference. |
| `shell.json` | **copy by hand** | The Omarchy shell persists it with atomic writes (temp file + rename) on every bar/widget/idle change made through the UI, and five migrations rewrite it the same way. Either destroys a symlink. |
| `themes/dracula-pro-van-helsing/` | symlink (dir) | A symlinked theme dir is treated as user-written and unrestricted, so it may ship terminal colour files. |

`~/.config/hypr/hyprland.lua` states the contract itself: the five files it
`require`s are "loaded after Omarchy's defaults so package updates can improve
the defaults without rewriting your `~/.config/hypr` files". Track exactly the
five Omarchy promises not to touch.

## shell.json, by hand

```bash
cp omarchy/shell.json ~/.config/omarchy/shell.json && omarchy restart shell  # repo -> home
cp ~/.config/omarchy/shell.json omarchy/shell.json                           # home -> repo
```

## The theme

`omarchy theme set dracula-pro-van-helsing`

`colors.toml` is the source of truth — Omarchy generates 17 per-app files from
it (`shell.toml`, `hyprland.lua`, `vscode-theme.json`, `btop.theme`,
`helix.toml`, `neovim.lua`, `claude.json`, …) at theme-set time, skipping any
file the theme already ships.

This theme ships four it must not let the templates generate —
`ghostty.conf`, `alacritty.toml`, `foot.ini`, `kitty.conf`. `omarchy-theme-color`
forces `color0 = background` unconditionally, but Dracula Pro separates them:
the background is `#0B0D0F` while ANSI black is `#22212C`. A generated file
would render ANSI black invisible against the background and break any TUI that
draws with `color0`. Keep those four in step with
`$OMARCHY_PATH/default/themed/*.tpl` when Omarchy adds keys; the drift check in
`AGENTS.md` covers it.

The background is a generated gradient, on-palette and ~50 KB, rather than a
photo of unknown provenance in a public repo:

```bash
magick -size 2160x3840 gradient:'#2B2145-#0B0D0F' -rotate 90 \
  -resize '3840x2160!' \
  omarchy/themes/dracula-pro-van-helsing/backgrounds/van-helsing.png
```

It was `gradient:'#0B0D0F-#22212C'` first — two near-blacks, which renders as a
blank desktop and reads as a broken install. If you change it, look at the
result before committing: a wallpaper is the one file in this repo you cannot
verify by reading it.

Photographic wallpapers belong in `~/.config/omarchy/backgrounds/dracula-pro-van-helsing/`,
which `omarchy theme bg` searches *ahead* of the theme's own folder and which
stays out of git. Omarchy's bundled ones are good source material:

```bash
mkdir -p ~/.config/omarchy/backgrounds/dracula-pro-van-helsing
cp /usr/share/omarchy/themes/tokyo-night/backgrounds/1-quattro.jpg \
   ~/.config/omarchy/backgrounds/dracula-pro-van-helsing/
omarchy theme bg set ~/.config/omarchy/backgrounds/dracula-pro-van-helsing/1-quattro.jpg
```

## Fonts

The family converges on the Mac's, the size does not — `monitors.lua` sets
`GDK_SCALE=2`, so Omarchy's `size=9` and the Mac's `13` already render at a
comparable physical size.

```bash
omarchy font set "Hack Nerd Font Mono"    # ttf-hack-nerd, from the Archfile
```

That writes `~/.config/fontconfig/fonts.conf` *and* `sed -i`s the four terminal
configs. Neither is tracked: the file is fully generated, and `sed -i` unlinks
and recreates, so a symlink there would not survive anyway.

## Do not run casually

`omarchy refresh hyprland` and `omarchy refresh shell` both go through
`omarchy-refresh-config`, which is `cp -f` — it follows the symlink and
overwrites the **repo** file. Recoverable with `git checkout`, but check
`git status` afterwards either way.
