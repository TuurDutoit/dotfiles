alias ae='emulator -avd "$(emulator -list-avds | head -n 1)" &'
alias as='adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3000 tcp:3000'
alias am='adb shell input keyevent 82'
alias ad='adb devices'
