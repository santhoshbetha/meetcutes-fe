import React, { useState, useRef, useEffect, useMemo } from "react";
import AutoCompleteItem from "./AutoCompleteItem";
import { Input } from "./ui/input";

function isObjEmpty(val){
    return (val == null || val.length <= 0 ||
        (Object.keys(val).length === 0 && val.constructor === Object)
    ) ? true : false;
}

export function AutoComplete({ data, onSelect, formik, /*setAddressOne*/}) {
    const [isVisible, setVisiblity] = useState(false);
    const [search, setSearch] = useState("");
    const [cursor, setCursor] = useState(-1);

    const searchContainer = useRef(null);
    const searchResultRef = useRef(null);

    useEffect(() => {
        window.addEventListener("mousedown", handleClickOutside);

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const scrollIntoView = position => {
        searchResultRef.current.parentNode.scrollTo({
            top: position,
            behavior: "smooth"
        });
    };

    useEffect(() => {
        if (cursor < 0 || cursor > suggestions.length || !searchResultRef) {
            return () => {};
        }

        let listItems = Array.from(searchResultRef.current.children);
        listItems[cursor] && scrollIntoView(listItems[cursor].offsetTop);
    }, [cursor]);

    const suggestions = useMemo(() => {
        if (!search) return data;

        setCursor(-1);
        scrollIntoView(0);

        return data?.filter(item =>
            item?.address1?.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    const handleClickOutside = event => {
        if (
            searchContainer.current &&
            !searchContainer.current.contains(event.target)
        ) {
            hideSuggestion();
        }
    };

    const showSuggestion = () => setVisiblity(true);

    const hideSuggestion = () => setVisiblity(false);

    const keyboardNavigation = e => {
        if (e.key === "ArrowDown") {
            isVisible
                ? setCursor(c => (c < suggestions.length - 1 ? c + 1 : c))
                : showSuggestion();
        }

        if (e.key === "ArrowUp") {
            setCursor(c => (c > 0 ? c - 1 : 0));
        }

        if (e.key === "Escape") {
            hideSuggestion();
        }

        if (e.key === "Enter" && cursor > 0) {
            setSearch(suggestions[cursor].name);
            hideSuggestion();
            onSelect(suggestions[cursor]);
        }
    };

    return (
        <div style={{ height: "100%" }} ref={searchContainer} className="w-full">

            <input 
                required
                type="text" 
                id="address1" 
                placeholder="" 
                autoComplete="off"
                onBlur={formik.handleBlur}
                value={formik.values.address1}
                //value={search}
                onClick={showSuggestion}
                onChange={e => {
                    formik.handleChange(e)
                    setSearch(e.target.value)
                }}
                className='appearance-none block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground 
                    focus:outline-none focus:ring-primary focus:border-primary sm:text-sm' 
            />

            <div
                className={`search-result bg-background z-50 cursor-pointer w-[87%] ${
                    isVisible ? "visible" : "invisible"
                }`}
            >
                <ul className="" ref={searchResultRef}>
                    {!isObjEmpty(suggestions) && suggestions?.map((item, idx) => (
                        <AutoCompleteItem
                            key={idx}
                            onSelectItem={() => {
                                hideSuggestion();
                                //setSearch(item?.address1);
                                //onSelect(item?.address1);
                                //setAddressOne(item?.address1)
                                formik.values.address1 = item?.address1
                            }}
                            isHighlighted={cursor === idx ? true : false}
                            {...item}
                        />
                    ))}
                </ul>
            </div>
            {formik.errors.address1 ? <p className="text-red-700">{formik.errors.address1} </p>: null}
        </div>
    );
};


/*
            <input 
                id='address1'
                name='address1'
                type='text'
                onChange={e => {
                    formik.handleChange(e)
                    setSearch(e.target.value)
                }}
                required
                className='appearance-none block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground 
                focus:outline-none focus:ring-primary focus:border-primary sm:text-sm' 
                placeholder='123 Ave, Sometown USA'                      
            />
*/