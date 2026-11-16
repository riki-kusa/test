import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import styles from './input.css';

const Input = ({className, small = false, ...componentProps}) => {
    return (
        <input
            {...componentProps}
            className={classNames(
                styles.inputForm,
                className,
                {
                    [styles.inputSmall]: small
                }
            )}
        />
    );
};

Input.propTypes = {
    className: PropTypes.string,
    small: PropTypes.bool
};

export default Input;
