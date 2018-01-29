var gem_id;
var price;
var event_source;

function showInvoice(invoice) {
  $("#invoice_err").text('');
  $("#pay_req").val(invoice.payment_request);
  $("#pay_link").prop('href', 'lightning:' + invoice.payment_request);
  $("#pay_err").empty();
  new QRious({
    element: document.getElementById('qr'),
    value: invoice.payment_request,
    size: 250
  });
  $('#qr').show();
  $("#pay_req").show();
  $("#step_two").fadeIn('fast');
  //$("#step_one").fadeOut('fast');
  $('#loading').fadeOut('fast');
}

function refresh() {
  $("#step_one").show();
  $("#step_two").hide();
  $("#payment").show();
  $("#receipt").hide();
  $("#reset").hide();
  $("#refresh").hide();
  $("#pay_req").val('');
  $("#pay_req_out").val('');
  $("#name").val('');
  $("#url").val('');
  $("#node").val('');
  $('#qr').hide();
  $.get('/status', function(status) {
    if (status.gem.owner) {
      $("#owner").text(status.gem.owner);
      if (status.gem.url)
        $("#owner").prop("href", status.gem.url);
      else
        $("#owner").removeAttr("href");
    } else
      $("#owner").text("Nobody - You can be the first to own it!");
    $("#owner_count").text(status.gem._id);
    $("#paid_out_sum").text((status.paidOutSum / 100).toLocaleString());
    price = status.gem.price;
    $(".price").text((price / 100).toLocaleString() + ' bit' + ((price === 100) ? '' : 's'));
    $(".payout").text((Math.round(1.25 * price) / 100).toLocaleString());
    $("#payout_sats").text(Math.round(1.25 * price));
    $("#new_price").text((Math.round(price * 1.3) / 100).toLocaleString());
    gem_id = status.gem._id;
  });
}
refresh();

$(window).on('unload', function() {
  if (event_source)
    event_source.close();
});

$(document).ready(function() {
  $("#submit").click(function() {
    if (!$("#name").val()) {
      $("#invoice_err").text("Please enter a name");
      return;
    }
    if ($("#url").val()) {
      if (!$("#url").val().startsWith('http')) {
        $("#invoice_err").text("Url must start with http or https");
        return;
      }
    }
    $('#loading').fadeIn('fast');
    $('#step_one').fadeOut('fast');

    $.post('/invoice', {
      name: $("#name").val(),
      url: $("#url").val(),
      pay_req_out: $("#pay_req_out").val(),
      gem_id: gem_id,
      value: price
    }, function(invoice) {
      showInvoice(invoice);
      if (!!window.EventSource) {
        event_source = new EventSource('/listen/' + invoice.r_hash);

        event_source.onmessage = function(e) {
          if (e.data == 'settled') {
            $("#payment").hide();
            $("#receipt").show();
          } else if (e.data == 'stale') {
            $("#pay_err").text("Stale payment received");
          } else if (e.data == 'expired') {
            $("#pay_req").hide();
            $("#qr").hide();
            $("#pay_err").text("Gem expired, refresh the page");
          } else if (e.data == 'reset') {
            $("#payment").hide();
            $("#reset").show();
          }
          event_source.close();
          $("#refresh").show();
        };

        event_source.onerror = function(e) {
          if (e.target.readyState == EventSource.CLOSED) {
            $("#pay_err").text("Disconnected from server, refresh the page");
          }
        };
      } else {
        console.log("Your browser doesn't support SSE");
      }
    }).fail(function(response) {
      if (response.responseText)
        $("#invoice_err").text(response.responseText);
      else {
        $("#invoice_err").text("unknown error creating invoice");
      }
      $('#step_one').fadeIn('fast');
      $('#loading').fadeOut('fast');
    });
  });

  $("#refresh").click(function() {
    refresh();
  });
});