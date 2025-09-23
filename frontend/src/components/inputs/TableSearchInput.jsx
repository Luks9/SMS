import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';

const TableSearchInput = ({
  value = '',
  onSearch,
  debounceDelay = 400,
  placeholder = 'Buscar...',
  autoFocus = false,
  isLoading = false,
  className = '',
  size = 'small',
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const didMountRef = useRef(false);
  const onSearchRef = useRef(onSearch);
  const MIN_SEARCH_CHARS = 3;

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const triggerSearch = (rawTerm) => {
    if (typeof onSearchRef.current !== 'function') {
      return;
    }

    const trimmedTerm = rawTerm.trim();

    if (trimmedTerm.length === 0) {
      onSearchRef.current('');
      return;
    }

    if (trimmedTerm.length > MIN_SEARCH_CHARS) {
      onSearchRef.current(trimmedTerm);
    }
  };

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const handler = setTimeout(() => {
      triggerSearch(internalValue);
    }, debounceDelay);

    return () => clearTimeout(handler);
  }, [internalValue, debounceDelay]);

  const handleSubmit = (event) => {
    event.preventDefault();
    triggerSearch(internalValue);
  };

  const handleChange = (event) => {
    setInternalValue(event.target.value);
  };

  const handleClear = () => {
    setInternalValue('');
    triggerSearch('');
  };

  const trimmedValue = internalValue.trim();
  const canTriggerSearch = trimmedValue.length === 0 || trimmedValue.length > MIN_SEARCH_CHARS;
  const sizeClass = size ? `is-${size}` : '';
  const inputClass = ['input', sizeClass].filter(Boolean).join(' ');
  const formClassName = className ? `field has-addons ${className}` : 'field has-addons';
  const submitClass = ['button', 'is-primary', sizeClass, isLoading ? 'is-loading' : ''].filter(Boolean).join(' ');
  const clearClass = ['button', 'is-light', sizeClass].filter(Boolean).join(' ');

  return (
    <form className={formClassName} onSubmit={handleSubmit} role="search">
      <div className="control is-expanded has-icons-left">
        <input
          type="search"
          className={inputClass}
          placeholder={placeholder}
          value={internalValue}
          onChange={handleChange}
          autoFocus={autoFocus}
          disabled={isLoading}
        />
        <span className="icon is-left">
          <FontAwesomeIcon icon={faSearch} />
        </span>
      </div>
      {internalValue && (
        <div className="control">
          <button
            type="button"
            className={clearClass}
            onClick={handleClear}
            disabled={isLoading}
            aria-label="Limpar busca"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}
      <div className="control">
        <button type="submit" className={submitClass} disabled={isLoading || !canTriggerSearch}>
          Buscar
        </button>
      </div>
    </form>
  );
};

export default TableSearchInput;
