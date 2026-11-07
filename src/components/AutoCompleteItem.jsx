import React from "react";

const AutoCompleteItem = ({
    address1,
    city,
    state,
    onSelectItem,
    isHighlighted
}) => {
    return (
        <li
            className={`list-group-item ${
                isHighlighted ? "active highlighted" : ""
            }`}
            onClick={onSelectItem}
        >
            <div className="mb-2 border-b-2 px-2 pb-2">
                <div className="text-left">
                    <p className="mb-0 font-bold leading-4">
                        {address1}{" "}
                    </p>
                    <p className="mb-0 inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 bg-primary">
                        {city}
                    </p>
                    <p className="mb-0 ml-2 inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 bg-secondary">
                        {state}
                    </p>
                </div>
            </div>
        </li>
    );
};

export default AutoCompleteItem;
