#!/usr/bin/env sh

# Example:
#   abs_path "ubuntu/device_daemon.sh" => "/home/ubuntu/device_daemon.sh"
# Does't support symlinks. Would require a more verbose implementation: http://stackoverflow.com/a/1116890
# Custom implementation of basic `readlink`
abs_path() {
  local rel_path="$1"
  local cwd
  cwd=$(pwd)
  cd $(dirname "$rel_path")
  echo $(pwd)/$(basename "$rel_path")
  cd "$cwd"
}

# Example: script_path => /root/device_daemon.sh
# NOTE: This doesn't work in sourced debug mode
script_path() {
  abs_path "$0"
}

# Example: script_path => /root
# NOTE: This doesn't work in sourced debug mode
basedir() {
  dirname $(script_path)
}

# Imports a script by sourcing it
# NOTE: Some distributions require the full path for sourcing scripts
import() {
  local script="$1"
  . "$(basedir)/${script}"
}

# Make the script working from any current working directory
cd "$(basedir)"
import "utils.sh"
setup_debug_mode
# Pass original parameters to main function
main "$@"
