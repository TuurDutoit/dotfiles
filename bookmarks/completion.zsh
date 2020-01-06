
(( $+functions[_bookmark-add] )) ||
_bookmark-add(){
    local curcontext=$curcontext state line ret=1
    declare -A opt_args
    _arguments -w -C -S -s \
        '1:: :_guard "([^-]?#|)" bookmark name'\
        '2:Bookmark Target:_path_files -/' 

    case $state in
        help)
            _values 'name' 
    esac

}

(( $+functions[_bookmark-delete] )) ||
_bookmark-delete(){
    local curcontext=$curcontext state line ret=1
    declare -A opt_args
    _arguments -w -C -S -s \
        '(-)*:: :->delete'
    case $state in
        delete)
            _values 'bookmarks' $(_list_bookmarks)
            ;;
    esac
}

(( $+functions[_bookmark-rename] )) ||
_bookmark-rename(){
    local curcontext=$curcontext state line ret=1
    declare -A opt_args
    _arguments -w -C -S -s \
        '1:: :->oldname'\
        '2:: :_guard "([^-]?#|)" new name'

    case $state in
        oldname)
            _values 'current name' $(_list_bookmarks)
            ;;
    esac
}

_bookmark_commands(){
    local -a main_commands
    main_commands=(
        add:'add new bookmark'
        delete:'delete existing bookmark'
        rename:'rename an existing bookmark'
    )
    integer ret=1
    _describe -t main-commands 'commands' main_commands && ret=0
    return ret
}

_bookmark_arg_list=(
    {'(--add)-a','(-a)--add'}'[add new bookmark]:select bookmark:_path_files'
    {'(--delete)-d','(-d)--delete'}'[delete bookmark]:select bookmark:->delete'
    '(-): :->command' \
    '(-)*:: :->option-or-argument'
)

_bookmark(){ 
    local curcontext=$curcontext state line
    declare -A opt_args
    _arguments $_bookmark_arg_list
    case $state in
        command)
            _bookmark_commands #&& ret=0
            ;;
        option-or-argument)
            if (( $+functions[_bookmark-$words[1]] )); then
                _call_function ret _bookmark-$words[1]
            elif zstyle -T :completion:$curcontext: use-fallback; then
                _files && ret=0
            else
                _message 'unknown sub-command'
            fi
            ;;
        delete)
            _values 'bookmarks' $(_list_bookmarks)
            ;;
    esac
}

compdef _bookmark bookmark

#_bookmark_cd_comp(){
#    _cd
#    if [ $CURRENT = 2 ]; then
#        compadd -S '/' -V bookmarks -X %Bbookmarks%b -d $(_list_bookmarks)
#    fi
#}
#compdef _bookmark_cd_comp cd

if ! declare -f orig_files > /dev/null; then
    builtin autoload +X _files
    eval "$(echo "orig_files(){"; declare -f _files | tail -n +2)"
    _files() {
        typeset -A dirs
        dirs=($(_name_bookmarks))
        orig_files $@
        local expl
        _wanted arguments expl bookmarks compadd -P "~" -S '/' -k dirs
    }
fi

if ! declare -f orig_path_files > /dev/null; then
    builtin autoload +X _path_files
    eval "$(echo "orig_path_files(){"; declare -f _path_files | tail -n +2)"
    _path_files() {
        typeset -A dirs
        dirs=($(_name_bookmarks))
        orig_path_files $@
        _wanted arguments expl bookmarks compadd -P "~" -qS '/' -k dirs
    }
fi

