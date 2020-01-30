for v in $(/bin/ls /Library/Java/JavaVirtualMachines); do
  jenv add "/Library/Java/JavaVirtualMachines/${v}/Contents/Home"
done