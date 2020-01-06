
# Set BOOKMARKS_FILE if it doesn't exist to the default.
# Allows for a user-configured BOOKMARKS_FILE.
if [[ -z $BOOKMARKS_FILE ]] ; then
  export BOOKMARKS_FILE="$HOME/.zsh_bookmarks"
fi

# Check if $BOOKMARKS_FILE is a symlink.
if [[ -L $BOOKMARKS_FILE ]]; then
  BOOKMARKS_FILE=${BOOKMARKS_FILE:A}
fi

# Create bookmarks_file it if it doesn't exist
if [[ ! -f $BOOKMARKS_FILE ]]; then
  touch $BOOKMARKS_FILE
fi


function _load_bookmarks(){
    old_IFS=$IFS      # save the field separator
    IFS=$'\n'         # new field separator, the end of line
    for line in $(cat $BOOKMARKS_FILE)
    do
        local markname=$(echo "$line" | cut -d "|" -f 1 | xargs)
        local markpath=$(echo "$line" | cut -d "|" -f 2 | xargs)
        hash -d -- ${markname}=${markpath}
    done
    IFS=$old_IFS
}

function _list_bookmarks_details(){
    old_IFS=$IFS      # save the field separator
    IFS=$'\n'         # new field separator, the end of line
    tab=""
    for line in $(cat $BOOKMARKS_FILE | sort -d)
    do
        local markname=$(echo "$line" | cut -d "|" -f 1 | xargs)
        local markpath=$(echo "$line" | cut -d "|" -f 2 | xargs)
        tab="$tab$(echo "${markname} => ${markpath}")\n"
    done
    echo $tab | column -t
    IFS=$old_IFS
}

function _list_bookmarks(){
    old_IFS=$IFS      # save the field separator
    IFS=$'\n'         # new field separator, the end of line
    for line in $(cat $BOOKMARKS_FILE | sort -d)
    do
        local markname=$(echo "$line" | cut -d "|" -f 1 | xargs)
        echo "${markname}"
    done
    IFS=$old_IFS
}

function _name_bookmarks(){
    old_IFS=$IFS      # save the field separator
    IFS=$'\n'         # new field separator, the end of line
    typeset -A tab
    for line in $(cat $BOOKMARKS_FILE)
    do
        local markname=$(echo "$line" | cut -d "|" -f 1 | xargs)
        local markpath=$(echo "$line" | cut -d "|" -f 2 | xargs)
        tab[$markname]="$markpath"
    done
    IFS=$old_IFS
    echo ${(kv)tab}
}

function _bookmark_exists(){
    exists=1
    void=$(cat $BOOKMARKS_FILE | grep -oe "^[[:space:]]*$1[[:space:]]*|")
    return $?
}

function _get_bookmark_path(){
    echo $(cat $BOOKMARKS_FILE | grep -e "^[[:space:]]*$1[[:space:]]*|" | cut -d "|" -f 2 | xargs)
}

function _rename_bookmark(){
    local oldname=$1
    local newname=$2
    
    if [[ ! _bookmark_exists(${oldname}) ]]; then
        echo "Bookmark $oldname doesn't exists"
        return
    fi

    if [[ ! _bookmark_exists(${newname}) ]]; then
        echo "Bookmark $newname already exists, choose a different name"
        return;
    fi

    bookmark_path=$(_get_bookmark_path ${oldname})
    sed -i -r "/^[[:space:]]*${bookmark}[[:space:]]*\\|/d" $BOOKMARKS_FILE
    echo "${newname} | ${bookmark_path}" >> $BOOKMARKS_FILE
    _load_bookmarks
}

function _add_bookmark(){
    if [[ ! _bookmark_exists(${1}) ]]; then
        echo "Bookmark $1 already exists, choose a different name"
        return;
    fi

    if [ $# = 1 ]; then
        echo "$1 | $(pwd)" >> $BOOKMARKS_FILE
    else
        echo "$1 | ${2:A}" >> $BOOKMARKS_FILE
    fi
    _load_bookmarks
}

function _delete_bookmark(){
    for bookmark in $@;
    do
        echo "delete $bookmark from bookmarks"
        sed -i -r "/^[[:space:]]*${bookmark}[[:space:]]*\\|/d" $BOOKMARKS_FILE
    done
}



function bookmark() {
    if (( $# == 0 )); then
        _list_bookmarks_details
        return 0
    fi

    case $1 in
        -a|--add|add)
            shift
            _add_bookmark $@
            ;;
        -d|--delete|delete)
            shift
            _delete_bookmark $@
            ;;
        -r|--rename|rename)
            shift
            _rename_bookmark $@
            ;;
    esac
}


_load_bookmarks




