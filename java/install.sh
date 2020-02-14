for v in $(/bin/ls /Library/Java/JavaVirtualMachines); do
  echo "› jenv add \"/Library/Java/JavaVirtualMachines/${v}/Contents/Home\""
  jenv add "/Library/Java/JavaVirtualMachines/${v}/Contents/Home"
done