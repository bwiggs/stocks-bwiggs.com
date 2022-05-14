EXT_UUID=stockquotes@bwiggs.com

default: tmux

tmux:
	tmuxinator start ${EXT_UUID} -n

dev:
	bash dev.sh ${EXT_UUID}

logs:
	tail -fn 0 ~/.xsession-errors | grep " \[${EXT_UUID}\] "

xsession-errors:
	tail -fn 0 ~/.xsession-errors | grep -v " \[${EXT_UUID}\] "