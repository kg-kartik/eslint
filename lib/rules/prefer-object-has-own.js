/**
 * @fileoverview Prefers Object.hasOwn instead of Object.prototype.hasOwnProperty
 * @author Nitin Kumar
 * @author Gautam Arora
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const astUtils = require("./utils/ast-utils");

/**
 * Checks to see if a property name object exists in the subtree recursively.
 * @param {ASTnode} node to evalutate.
 * @returns {boolean} `true` if object property exists, `false` otherwise.
 */
function hasLeftHandObject(node) {
    if (!node.object) {
        return false;
    }

    const objectPropertyName = astUtils.getStaticPropertyName(node.object);
    let objectNodeToCheck = node.object;

    if (objectPropertyName === "prototype") {
        objectNodeToCheck = node.object.object;

        // for case - `({}).prototype.hasOwnProperty.call(a, b)`
        if (objectNodeToCheck.type === "ObjectExpression") {
            return false;
        }
    }

    /*
     * Object.hasOwnProperty.call(obj, prop) or ({}).hasOwnProperty.call(obj, prop) - `true`
     * ({ foo }.hasOwnProperty.call(obj, prop)) - `false`, object literal should be empty
     */
    if (objectNodeToCheck.name === "Object" || (objectNodeToCheck.type === "ObjectExpression" && objectNodeToCheck.properties.length === 0)) {
        return true;
    }

    return false;
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../shared/types').Rule} */
module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "disallow use of Object.prototype.hasOwnProperty.call(…) and prefer use of Object.hasOwn(…)",
            recommended: false,
            url: "https://eslint.org/docs/rules/prefer-object-has-own"
        },
        schema: [],
        messages: {
            useHasOwn: "Prefer using Object.hasOwn(…) over Object.prototype.hasOwnProperty.call(…)."
        },
        fixable: "code"
    },
    create(context) {
        return {
            CallExpression(node) {
                const calleePropertyName = astUtils.getStaticPropertyName(node.callee);
                const objectPropertyName = astUtils.getStaticPropertyName(node.callee.object);
                const isObject = node.callee.object && hasLeftHandObject(node.callee.object);

                // check `Object` scope
                const scope = context.getScope();
                const variable = astUtils.getVariableByName(scope, "Object");

                if (
                    calleePropertyName === "call" &&
                    objectPropertyName === "hasOwnProperty" &&
                    isObject &&
                    variable && variable.scope.type === "global"
                ) {
                    context.report({
                        node,
                        messageId: "useHasOwn",
                        fix(fixer) {
                            const sourceCode = context.getSourceCode(node);

                            if (sourceCode.getCommentsInside(node.callee).length > 0) {
                                return null;
                            }

                            return fixer.replaceText(node.callee, "Object.hasOwn");
                        }
                    });
                }
            }
        };
    }
};