AVAILABLE_DEVICES=$(adb devices | tail -n +2 | cut -f1)
DEVICES=${1:-$AVAILABLE_DEVICES}

for d in $DEVICES; do
  echo $d
  adb -s $d reverse tcp:8081 tcp:8081
  adb -s $d reverse tcp:8083 tcp:8083
  adb -s $d reverse tcp:3000 tcp:3000
  adb -s $d reverse tcp:1234 tcp:1234
done