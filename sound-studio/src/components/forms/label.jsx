import PropTypes from 'prop-types';
import React from 'react';

import styles from './label.css';

const Label = ({above = false, children, secondary = false, text}) => (
    <label className={above ? styles.inputGroupColumn : styles.inputGroup}>
        <span className={secondary ? styles.inputLabelSecondary : styles.inputLabel}>
            {text}
        </span>
        {children}
    </label>
);

Label.propTypes = {
    above: PropTypes.bool,
    children: PropTypes.node,
    secondary: PropTypes.bool,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired
};

export default Label;
