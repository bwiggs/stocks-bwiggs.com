#!/usr/bin/env

while inotifywait --event modify -q *.js*; do
    # echo "`date -Iseconds`: reloading $1"
    dbus-send --session --dest=org.Cinnamon.LookingGlass --type=method_call /org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension string:"${1}" string:'APPLET'
done;