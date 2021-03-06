/** @jsx React.DOM */

var React             = require('react');
var BlurInput         = require("react-components/blur-input");
var InfoTip           = require("react-components/info-tip");
var Renderer          = require("../renderer.jsx");
var TeX               = require("../tex.jsx");
var InputWithExamples = require("../components/input-with-examples.jsx");

var ApiOptions = require("../perseus-api.jsx").Options;
var Util = require("../util.js");
var EnabledFeatures = require("../enabled-features.jsx");

var toNumericString = KhanUtil.toNumericString;

var answerTypes = {
    number: {
        name: "Numbers",
        forms: "integer, decimal, proper, improper, mixed"
    },
    decimal: {
        name: "Decimals",
        forms: "decimal"
    },
    integer: {
        name: "Integers",
        forms: "integer"
    },
    rational: {
        name: "Fractions and mixed numbers",
        forms: "integer, proper, improper, mixed"
    },
    improper: {
        name: "Improper numbers (no mixed)",
        forms: "integer, proper, improper"
    },
    mixed: {
        name: "Mixed numbers (no improper)",
        forms: "integer, proper, mixed"
    },
    percent: {
        name: "Numbers or percents",
        forms: "integer, decimal, proper, improper, mixed, percent"
    },
    pi: {
        name: "Numbers with pi", forms: "pi"
    }
};

var formExamples = {
    "integer": function(options) { return $._("an integer, like $6$"); },
    "proper": function(options) {
        if (options.simplify === "optional") {
            return $._("a *proper* fraction, like $1/2$ or $6/10$");
        } else {
            return $._("a *simplified proper* fraction, like $3/5$");
        }
    },
    "improper": function(options) {
        if (options.simplify === "optional") {
            return $._("an *improper* fraction, like $10/7$ or $14/8$");
        } else {
            return $._("a *simplified improper* fraction, like $7/4$");
        }
    },
    "mixed": function(options) {
        return $._("a mixed number, like $1\\ 3/4$");
    },
    "decimal": function(options) {
        return $._("an *exact* decimal, like $0.75$");
    },
    "percent": function(options) {
        return $._("a percent, like $12.34\\%$");
    },
    "pi": function(options) {
        return $._("a multiple of pi, like $12\\ \\text{pi}$ or " +
                "$2/3\\ \\text{pi}$");
    }
};

var InputNumber = React.createClass({
    propTypes: {
        currentValue: React.PropTypes.string,
        enabledFeatures: EnabledFeatures.propTypes,
    },

    getDefaultProps: function() {
        return {
            currentValue: "",
            size: "normal",
            answerType: "number",
            enabledFeatures: EnabledFeatures.defaults,
            apiOptions: ApiOptions.defaults
        };
    },

    shouldShowExamples: function() {
        return this.props.enabledFeatures.toolTipFormats &&
                this.props.answerType !== "number";
    },

    render: function() {
        if (this.props.apiOptions.staticRender) {
            var style = {
                borderRadius: "5px",
                padding: "4px",
                background: "white",
                border: "1px solid #a4a4a4"
            };
            return <span style={style}>
                <TeX ref="input" onClick={this._handleFocus}>
                    {this.props.currentValue}
                </TeX>
            </span>;
        } else {
            return <InputWithExamples
                    ref="input"
                    value={this.props.currentValue}
                    onChange={this.handleChange}
                    className={"perseus-input-size-" + this.props.size}
                    examples={this.examples()}
                    shouldShowExamples={this.shouldShowExamples()}
                    interceptFocus={this._getInterceptFocus()}
                    onFocus={this._handleFocus}
                    onBlur={this._handleBlur} />;
        }
    },

    _handleFocus: function() {
        if (this.props.apiOptions.staticRender) {
            this.props.onFocus([], this.refs.input.getDOMNode());
        } else {
            this.props.onFocus([], this.refs.input.getInputDOMNode());
        }
    },

    _handleBlur: function() {
        this.props.onBlur([], this.refs.input.getInputDOMNode());
    },

    _getInterceptFocus: function() {
        return this.props.apiOptions.interceptInputFocus &&
                this._interceptFocus;
    },

    _interceptFocus: function() {
        this.props.onFocus([], this.refs.input.getInputDOMNode());
        var interceptProp = this.props.apiOptions.interceptInputFocus;
        if (interceptProp) {
            return interceptProp(
                this.props.widgetId,
                this.refs.input.getInputDOMNode()
            );
        }
    },

    handleChange: function(newValue) {
        this.props.onChange({ currentValue: newValue });
    },

    focus: function() {
        this.refs.input.focus();
        return true;
    },

    toJSON: function(skipValidation) {
        return {
            currentValue: this.props.currentValue
        };
    },

    simpleValidate: function(rubric, onInputError) {
        onInputError = onInputError || function() { };
        return InputNumber.validate(
            this.toJSON(),
            rubric,
            onInputError
        );
    },

    examples: function() {
        var type = this.props.answerType;
        var forms = answerTypes[type].forms.split(/\s*,\s*/);

        var examples = _.map(forms, function(form) {
            return formExamples[form](this.props);
        }, this);

        return [$._("**Acceptable Formats**")].concat(examples);
    },

    statics: {
        displayMode: "inline-block"
    }
});

_.extend(InputNumber, {
    validate: function(state, rubric, onInputError) {
        if (rubric.answerType == null) {
            rubric.answerType = "number";
        }
        var val = Khan.answerTypes.number.createValidatorFunctional(
            rubric.value, {
                simplify: rubric.simplify,
                inexact: rubric.inexact || undefined,
                maxError: rubric.maxError,
                forms: answerTypes[rubric.answerType].forms
            });

        var result = val(state.currentValue);

        // TODO(eater): Seems silly to translate result to this invalid/points
        // thing and immediately translate it back in ItemRenderer.scoreInput()
        if (result.empty) {
            var apiResult = onInputError(
                null, // reserved for some widget identifier
                state.currentValue,
                result.message
            );
            return {
                type: "invalid",
                message: (apiResult === false) ? null : result.message
            };
        } else {
            return {
                type: "points",
                earned: result.correct ? 1 : 0,
                total: 1,
                message: result.message
            };
        }
    }
});

var InputNumberEditor = React.createClass({
    getDefaultProps: function() {
        return {
            value: "0",
            simplify: "required",
            size: "normal",
            inexact: false,
            maxError: 0.1,
            answerType: "number"
        };
    },

    handleAnswerChange: function(str) {
        var value = Util.firstNumericalParse(str) || 0;
        this.props.onChange({value: value});
    },

    render: function() {
        var answerTypeOptions = _.map(answerTypes, function(v, k) {
            return <option value={k} key={k}>{v.name}</option>;
        }, this);

        return <div>
            <div><label>
                {' '}Correct answer:{' '}
                <BlurInput value={"" + this.props.value}
                           onChange={this.handleAnswerChange}
                           ref="input" />
            </label></div>

            <div>
            {' '}Answer type:{' '}
            <select
                value={this.props.answerType}
                onChange={e => {
                    this.props.onChange({answerType: e.target.value});
                }}>
                {answerTypeOptions}
            </select>
            <InfoTip>
                <p>Use the default "Numbers" unless the answer must be in a
                specific form (e.g., question is about converting decimals to
                fractions).</p>
            </InfoTip>
            </div>

            <div>
                <label>
                    {' '}Width{' '}
                    <select value={this.props.size}
                            onChange={e => {
                                this.props.onChange({size: e.target.value});
                            }}>
                        <option value="normal">Normal (80px)</option>
                        <option value="small">Small (40px)</option>
                    </select>
                </label>
                <InfoTip>
                    <p>Use size "Normal" for all text boxes, unless there are
                    multiple text boxes in one line and the answer area is too
                    narrow to fit them.</p>
                </InfoTip>
            </div>
        </div>;
    },

    focus: function() {
        this.refs.input.getDOMNode().focus();
        return true;
    },

    toJSON: function() {
        return _.pick(this.props,
                "value", "simplify", "size", "inexact", "maxError",
                "answerType");
    }
});

var propTransform = (editorProps) => {
    return _.pick(editorProps, "simplify", "size", "answerType");
};

module.exports = {
    name: "input-number",
    displayName: "Number text box",
    widget: InputNumber,
    editor: InputNumberEditor,
    transform: propTransform
};
