read -p "You must be connected to the VPN to install dbconnect.\nPress enter to continue"
echo '› pip3 install awscli'
pip3 install awscli
echo '› pip3 install git+https://github.com/datacamp/dbconnect-python'
pip3 install git+https://github.com/datacamp/dbconnect-python
echo '› bash <(curl -s https://docs.datacamp.com/engineering-wiki/assets/install-onelogin-aws-cli.sh)'
bash <(curl -s https://docs.datacamp.com/engineering-wiki/assets/install-onelogin-aws-cli.sh)
echo '› onelogin-aws-login -C dbconnect --user tuur@datacamp.com'
onelogin-aws-login -C dbconnect --user tuur@datacamp.com