



class SearchParams {

    _page;
    _per_page;
    _sort;
    _sort_dir;
    _filter;
    _search;

    constructor(props) {
        this.per_page = props.per_page || 10;
        this.page = props.page || 0;
        this.sort = props.sort || "data_criacao";
        this.sort_dir = props.sort_dir || "desc";
        this.filter = props.filter || null;
        this.search = props.search || null;
    }


    set page(value) {
        let _page = +value;
        if (isNaN(_page) || _page <= 0) {
            this._page = 0;
        } else {
            this._page = _page * this._per_page;
        }
    }

    set per_page(value) {
        if (value === undefined || value === null || isNaN(value) || parseInt(value) <= 0) {
            this._per_page = 15;
        } else {
            if (parseInt(value) > 100) {
                this._per_page = 100;
                return;
            }
            this._per_page = parseInt(value);
        }
    }

    set sort(value) {
        if (value === undefined || value === null || value === '') {
            this._sort = this._sort;
        } else {
            this._sort = value;
        }
    }

    set sort_dir(value) {
        if (value === undefined || value === null || (value !== 'asc' && value !== 'desc')) {
            this._sort_dir = this._sort_dir;
        } else {
            this._sort_dir = value;
        }
    }

    set search(value) {
        if ((value === undefined || value === null || value === '') || this._filter === null) {
            this._search = null;
        } else {
            this._search = value;
        }
    }


    set filter(value) {
        if (value === undefined || value === null || value === '') {
            this._filter = null;
        } else {
            this._filter = value;
        }
    }

    get page() {
        return this._page;
    }

    get per_page() {
        if (this._per_page === null) return 15;
        return this._per_page;
    }

    get sort() {
        return this._sort;
    }

    get sort_dir() {
        return this._sort_dir;
    }

    get filter() {
        if (this._filter === null) return ''
        return this._filter;
    }

    get search() {
        if (this._search === null) return ''
        return this._search;
    }



}


module.exports = SearchParams;