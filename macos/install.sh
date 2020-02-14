# The Brewfile handles Homebrew-based app and library installs, but there may
# still be updates and installables in the Mac App Store. There's a nifty
# command line interface to it that we can use to just install everything, so
# yeah, let's do that.

# Don't install Catalina, it breaks stuff
echo '› sudo softwareupdate --ignore "macOS Catalina"'
sudo softwareupdate --ignore "macOS Catalina"

#echo "› sudo softwareupdate -i -a"
# sudo softwareupdate -i -a
