'use strict';
(function ($) {
    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/eszpf-product-filter.default', function ($scope, $) {
            var EszLwcf = {
                'productLoader': $scope.find('.eszlwcf-loader'),
                'productQueryData': $scope.find('.eszlwcf-product-query').val(),
                'productSettingsData': $scope.find('.eszlwcf-widget-settings').val(),
                'productWidgetId': $scope.find('.eszlwcf-widget-id').val(),
                'loadMoreButton': $scope.find('.eszlwcf-load-more'),
                'productSortingForm': $scope.find('.eszlwcf-sorting-select'),
                'productFilterForm': $scope.find('.eszlwcf-filter-form'),
                'productFilterInput': $scope.find('input:not([type="search"]), select'),
                'productFilterSearch': $scope.find('input[type="search"], select'),
                'productFilterFrame': $scope.find('.eszlwcf-products-block'),
                'productFilterClearFrame': $scope.find('.eszlwcf-filter-clear-options'),
                'eszlwcfClearOption': $scope.find('.eszlwcf-clear-option'),
                'productFilterAction': 'eszlwcf_filter_products',
                'productLoadMoreAction': 'eszlwcf_load_more_products',
            }


            function eszLwcfResetForm() {
                EszLwcf.productFilterForm.trigger('reset');
                EszLwcf.productSortingForm.val('by-newest');
            }

            eszLwcfResetForm();

            function eszlwcfGetObjectToArray(eszlwcfObj) {
                if (typeof (eszlwcfObj) === 'object') {
                    return Object.keys(eszlwcfObj).map(key => eszlwcfObj[key])
                } else {
                    return eszlwcfObj;
                }
            }

            var EszLwcfData = {
                'settings': EszLwcf.productSettingsData,
                'query': EszLwcf.productQueryData,
                'widgetId': EszLwcf.productWidgetId
            };
            var eszlwcfCurrentRequest = null;

            function eszLwcfFilterAjax(eszlwcfFilterArgs, eszlwcfFilterAction, eszlwcfFilterPageCount = 1) {
                EszLwcfData.action = eszlwcfFilterAction;
                EszLwcfData.args = eszlwcfFilterArgs;
                EszLwcfData.page = eszlwcfFilterPageCount;

                eszlwcfCurrentRequest = $.ajax({
                    url: EszLwcfAjaxData.ajaxurl, // AJAX handler
                    data: EszLwcfData,
                    type: 'POST',
                    dataType: 'json',
                    beforeSend: function (xhr) {
                        EszLwcf.productLoader.addClass('active');
                        if (eszlwcfCurrentRequest != null) {
                            eszlwcfCurrentRequest.abort();
                        }
                    },
                    success: function (data) {
                        if (!$.isEmptyObject(data.selectedFilter) && data.selectedFilter !== null) {
                            var excludeKey = ['eszlwcf-range-value-min', 'eszlwcf-range-value-max', 'esz-product-search'];
                            var eszSelectedFilter = eszlwcfGetObjectToArray(data.selectedFilter);
                            var optionHTML = '', inputObj = '', ClearOption = {};
                            EszLwcf.productFilterClearFrame.find('.eszlwcf-clear-option').remove();
                            $.each(eszSelectedFilter, function (index, term) {
                                if (term.value !== '') {
                                    if ($.inArray(term.name, excludeKey) === -1) {
                                        inputObj = $scope.find('input[name="' + term.name + '"][value="' + term.value + '"]');
                                        if (inputObj.length === 0) {
                                            inputObj = $scope.find('option[value="' + term.value + '"]');
                                            ClearOption = {
                                                inputLabel: inputObj.attr('data-filed-label'),
                                                inputId: inputObj.parent('select').attr('id'),
                                                inputName: inputObj.parent('select').attr('name'),
                                                inputType: inputObj.parent('select').attr('type'),
                                                inputValue: inputObj.attr('Value'),
                                            };
                                        } else {
                                            ClearOption = {
                                                inputLabel: inputObj.attr('data-filed-label'),
                                                inputId: inputObj.attr('id'),
                                                inputName: inputObj.attr('name'),
                                                inputType: inputObj.attr('type'),
                                                inputValue: inputObj.attr('Value'),
                                            };
                                        }
                                        optionHTML = `<span class="eszlwcf-clear-option eszlwcf-clear" data-clear-option-id = "` + ClearOption.inputId + `" data-clear-option-name="` + ClearOption.inputName + `">` + ClearOption.inputLabel + `<i>×</i></span>`;
                                        if (inputObj.attr('type') !== 'radio') {
                                            if (EszLwcf.productFilterClearFrame.find('span[data-clear-option-id="' + ClearOption.inputId + '"]').length === 0) {
                                                EszLwcf.productFilterClearFrame.append(optionHTML);
                                            }
                                        } else if (inputObj.attr('type') === 'radio') {
                                            if (EszLwcf.productFilterClearFrame.find('span[data-clear-option-name="' + ClearOption.inputName + '"]').length === 0) {
                                                EszLwcf.productFilterClearFrame.append(optionHTML);
                                            } else {
                                                EszLwcf.productFilterClearFrame.find('span[data-clear-option-name="' + ClearOption.inputName + '"]').text(ClearOption.inputLabel).attr('data-clear-option-id', ClearOption.inputId);
                                            }
                                        }
                                        if (EszLwcf.productFilterClearFrame.find('.eszlwcf-clear-all').length === 0 && EszLwcf.productFilterClearFrame.find('.eszlwcf-clear-option').length > 1) {
                                            EszLwcf.productFilterClearFrame.prepend(`<span class="eszlwcf-clear-all eszlwcf-clear"> ` + data.translatedStringClearAll + ` <i>×</i></span>`);
                                        }
                                    }
                                }
                            });
                        }
                        if (data.result) {
                            if (eszlwcfFilterAction === 'eszlwcf_filter_products') {
                                EszLwcf.productFilterFrame.html(data.result); // insert new posts
                            } else if (eszlwcfFilterAction === 'eszlwcf_load_more_products') {
                                EszLwcf.productFilterFrame.append(data.result); // Append new posts
                            }
                            EszLwcf.loadMoreButton.attr('data-eszlwcf-page-count', data.eszlwcfPageCount);
                            EszLwcf.loadMoreButton.attr('data-eszlwcf-term-id', data.eszlwcfTermId);

                            if (data.eszlwcfMoreData === '0') {
                                EszLwcf.loadMoreButton.hide();
                                EszLwcf.productLoader.removeClass('active');
                            } else {
                                EszLwcf.loadMoreButton.show();
                                EszLwcf.productLoader.removeClass('active');
                            }
                        } else {
                            EszLwcf.loadMoreButton.hide();
                            EszLwcf.productLoader.removeClass('active');
                        }


                    }
                });
            }


            function clearOption() {
                $scope.find('.eszlwcf-clear-option').click(function () {
                    var clickedInput = $scope.find('#' + $(this).attr('data-clear-option-id'));
                    if (clickedInput.is('select')) {
                        clickedInput.val('');
                    } else {
                        clickedInput.removeAttr('checked');
                    }
                    clickedInput.trigger('change');
                    $(this).remove();
                    if (EszLwcf.productFilterClearFrame.find('.eszlwcf-clear-option').length <= 1) {
                        $scope.find('.eszlwcf-clear-all').remove();
                    }
                });
                $scope.find('.eszlwcf-clear-all').click(function () {
                    eszLwcfResetForm();
                    $(EszLwcf.productFilterInput[0]).trigger('change');
                    EszLwcf.productFilterClearFrame.html('');
                });
            }

            function eszlwcfGetFormSerializeData() {
                return {
                    filterFormArgs: EszLwcf.productFilterForm.serialize(),
                    sortingFormArgs: EszLwcf.productSortingForm.serialize(),
                    filterFormArray: EszLwcf.productFilterForm.serializeArray(),
                }
            }

            EszLwcf.productFilterInput.change(function () {
                eszLwcfFilterAjax(eszlwcfGetFormSerializeData(), EszLwcf.productFilterAction);
            })
            EszLwcf.loadMoreButton.click(function () {
                var pageCount = $(this).attr('data-eszlwcf-page-count');
                eszLwcfFilterAjax(eszlwcfGetFormSerializeData(), EszLwcf.productLoadMoreAction, pageCount);
            })


            //setup before functions
            var eszTypingTimer;                //timer identifier
            var eszDoneTypingInterval = 1000;  //time in ms, 5 second for example
            EszLwcf.productFilterSearch.on('keyup', function (e) {
                clearTimeout(eszTypingTimer);
                if ((e.which <= 90 && e.which >= 48) || (e.which <= 105 && e.which >= 96) || e.which === 8 || e.which === 35) {
                    eszTypingTimer = setTimeout(eszSearchProduct(), eszDoneTypingInterval);
                }

            });
            EszLwcf.productFilterSearch.on('keydown', function (e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    return false;
                }
                clearTimeout(eszTypingTimer);
            });

            function eszSearchProduct() {
                eszLwcfFilterAjax(eszlwcfGetFormSerializeData(), EszLwcf.productFilterAction);
            }


            function eszlwcfPriceRange() {
                var symbol = $scope.find('.eszlwcf-range-value-display').attr('data-eszlwcf-price-symbol');
                $scope.find(".eszlwcf-price-range").slider({
                    range: true,
                    min: 0,
                    max: $scope.find('.eszlwcf-range-value-display').attr('data-eszlwcf-range-max'),
                    values: [0, $scope.find('.eszlwcf-range-value-display').attr('data-eszlwcf-range-max')],
                    slide: function (event, ui) {
                        $scope.find(".eszlwcf-range-value-display").text(symbol + ui.values[0] + " - " + symbol + ui.values[1]);
                    },
                    stop: function (event, ui) {
                        $scope.find(".eszlwcf-range-value-min").val(ui.values[0]);
                        $scope.find(".eszlwcf-range-value-max").val(ui.values[1]);
                        eszLwcfFilterAjax(eszlwcfGetFormSerializeData(), EszLwcf.productFilterAction);
                    },
                });
                $scope.find(".eszlwcf-range-value-display").text(symbol + $scope.find(".eszlwcf-price-range").slider("values", 0) +
                    " - " + symbol + $scope.find(".eszlwcf-price-range").slider("values", 1));
            }

            eszlwcfPriceRange();


            $scope.find('.eszlwcf-filters-open-widget').click(function () {
                $scope.find('.eszlwcf-filter-frame').addClass('filter-open');
                $('body').addClass('eszlwcf-filter-open');
            });

            $scope.find('.eszlwcf-widget-close-icon').click(function () {
                $scope.find('.eszlwcf-filter-frame').removeClass('filter-open');
                $('body').removeClass('eszlwcf-filter-open');
            });


            function eszProductQuickViewModalShow() {
                $scope.find('.eszwcf-quick-view').off().click(function () {
                    $scope.find('.esz-product-modal-frame').addClass('active');
                    $scope.find('.esz-product-modal-inner-wrapper').append($(this).parents('.eszlwcf-product').children('.esz-product-modal').clone());
                    eszProductGallerySlider();
                });
            }

            eszProductQuickViewModalShow();

            $scope.find('.esz-modal-close').click(function () {
                $scope.find('.esz-product-modal-inner-wrapper').html('');
                $scope.find('.esz-product-modal-frame').removeClass('active');
                eszProductGallerySliderDestroy();
            });

            function eszProductGallerySlider() {
                $scope.find('.esz-product-modal-thumb-gallery').each(function () {
                    $(this).children('.esz-product-modal-image-slider').slick({
                        slidesToShow: 1,
                        slidesToScroll: 1,
                        arrows: true,
                        fade: true,
                        asNavFor: '.esz-product-modal-thumb-slider',
                    });
                    $(this).children('.esz-product-modal-thumb-slider').slick({
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        asNavFor: '.esz-product-modal-image-slider',
                        infinite: true,
                        dots: false,
                        arrows: false,
                        centerMode: true,
                        focusOnSelect: true
                    });
                });
            }

            function eszProductGallerySliderDestroy() {
                $scope.find('.esz-product-modal-thumb-gallery').each(function () {
                    $(this).children('.esz-product-modal-image-slider').slick('destroy');
                    $(this).children('.esz-product-modal-thumb-slider').slick('destroy');
                });
            }

            $( document ).ajaxComplete(function() {
                clearOption();
                eszProductQuickViewModalShow();
            });
        });

    });
})(jQuery);


