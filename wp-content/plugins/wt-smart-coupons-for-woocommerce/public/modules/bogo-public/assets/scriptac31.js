/**
 * BOGO public side JS file.
 * Free product selection functionality.
 *
 * @since 2.0.0
 * @package Wt_Smart_Coupon
 */

jQuery(
	function ($) {
		"use strict";

		$( document ).on(
			'change',
			'.wbte_give_away_product_attr',
			function () {
				let attributes = {};
				const parent     = $( this ).closest( '.wbte_get_away_product' );
				parent.find( '.wbte_give_away_product_attr' ).each(
					function (index) {
						attributes[$( this ).attr( 'data-attribute_name' )] = $( this ).val();
					}
				);

				if ( "" == $( this ).val() ) {
					parent.find( 'input[name="variation_id"]' ).val( 0 );
					parent.find( 'input[name="wt_variation_options"]' ).val( JSON.stringify( attributes ) );
					return false;
				}

				let stop_checking = false;
				$.each(
					attributes,
					function ( key, value ) {
						if ( '' === value ) {
							stop_checking = true;
							return false;
						}
					}
				);
				if ( stop_checking ) { /** Not every attributes selected. */
					return;
				}

				const product_id = parent.attr( 'product-id' );

				const data = {
					'attributes'    : attributes,
					'product'       : product_id,
					'_wpnonce'      : WTSmartCouponOBJ.nonces.public
				};

				$( '.wbte_choose_free_product, .checkout-button' ).prop( 'disabled', true ).css( {'opacity':.5, 'cursor':'not-allowed'} );
				$( '.wbte_get_away_product' ).css( {'opacity':.5, 'cursor':'wait'} );
				jQuery.ajax(
					{
						type: "POST",
						async: true,
						url: WTSmartCouponOBJ.wc_ajax_url + 'update_variation_id_on_choose',
						data: data,
						dataType: 'json',
						success:function (response) {
							$( '.wbte_choose_free_product, .checkout-button' ).prop( 'disabled', false ).css( {'opacity':1, 'cursor':'pointer'} );
							$( '.wbte_get_away_product' ).css( {'opacity':1, 'cursor':'default'} );
							if ( true === response.status ) {
								parent.find( 'input[name="variation_id"]' ).val( response.variation_id );
								parent.find( 'input[name="wt_variation_options"]' ).val( JSON.stringify( attributes ) );
								if ( response.img_url && '' !== response.img_url ) {
									parent.find( '.wbte_product_image img' ).attr( 'src', response.img_url );
								}
							} else {
								parent.find( 'input[name="variation_id"]' ).val( 0 );

								if ( false !== response.status_msg && "" !== response.status_msg.trim() ) { /* check message was disabled or not */
									alert( response.status_msg );
								}
							}
						},
						error:function () {
							parent.find( 'input[name="variation_id"]' ).val( 0 );
							$( '.wbte_choose_free_product, .checkout-button' ).prop( 'disabled', false ).css( {'opacity':1, 'cursor':'pointer'} );
							$( '.wbte_get_away_product' ).css( {'opacity':1, 'cursor':'default'} );
							alert( WTSmartCouponOBJ.labels.error );
						}
					}
				);
			}
		);

		$( document ).on(
			'click',
			'.wbte_choose_free_product',
			function (e) {
				e.preventDefault();

				const parent_obj = $( this ).closest( '.wbte_get_away_product' );
				if ( '1' === parent_obj.attr( 'data-is_purchasable' ) ) {
					let variation_id     = 0;
					const variation_id_obj = parent_obj.find( '[name="variation_id"]' );
					if ( 0 < variation_id_obj.length ) { /* variable product */
						if ( "" === variation_id_obj.val().trim() || "0" === variation_id_obj.val().trim() ) {
							alert( WTSmartCouponOBJ.labels.choose_variation );
							return false;
						} else {
							variation_id = variation_id_obj.val();
						}
					}

					const coupon_id = $( this ).closest( '.wbte_sc_bogo_products' ).attr( 'coupon' );
					if ( 'undefined' === typeof coupon_id ) {
						return false;
					}

					const product_id = $( this ).attr( 'prod-id' );
					if ( 'undefined' === typeof product_id ) {
						return false;
					}

					let free_qty = parent_obj.find( 'input[name="wbte_sc_bogo_quantity"]' ).val();
					free_qty     = free_qty > parent_obj.attr( 'data-free-qty' ) ? parent_obj.attr( 'data-free-qty' ) : free_qty;

					const variation_attributes = ( 0 < parent_obj.find( 'input[name="wt_variation_options"]' ).length ? JSON.parse( parent_obj.find( 'input[name="wt_variation_options"]' ).val() ) : '' );

					const data = {
						'_wpnonce'      	: WTSmartCouponOBJ.nonces.public,
						'product_id'    	: product_id,
						'variation_id'  	: variation_id,
						'attributes'    	: variation_attributes,
						'coupon_id'     	: coupon_id,
						'free_qty'      	: free_qty
					};
					wbte_sc_ajax_add_giveaway( $( this ), data );
				}

			}
		);

		function wbte_sc_ajax_add_giveaway( btn_elm, data )
		{
			const html_back = btn_elm.html();
			btn_elm.html( WTSmartCouponOBJ.labels.please_wait );

			const all_btn_elms = $( '.wbte_choose_free_product' );

			all_btn_elms.prop( 'disabled', true );

			if ( ! $( '.woocommerce-notices-wrapper' ).length ) {
				$( '#main' ).prepend( '<div class="woocommerce-notices-wrapper"></div>' );
			}

			$( '.woocommerce-notices-wrapper' ).html( '' );

			jQuery.ajax(
				{
					type:"POST",
					async:true,
					url: WTSmartCouponOBJ.wc_ajax_url + 'wbte_choose_free_product',
					data:data,
					success:function ( response ) {
						if ( response ) {
							location.reload();
						} else {
							$( '.woocommerce-notices-wrapper' ).html( response );
							$( "html, body" ).stop( true, true ).animate( {scrollTop:( $( '.woocommerce-notices-wrapper' ).offset().top - 70 )}, 500 );

							btn_elm.html( html_back );
							all_btn_elms.prop( 'disabled', false );
						}
					},
					error:function () {
						btn_elm.html( html_back );
						all_btn_elms.prop( 'disabled', false );
					}
				}
			);
		}
	}
);