angular.module('ionicApp', ['ionic']);
function MainCtrl($scope, $ionicSideMenuDelegate, $ionicScrollDelegate, $location, $ionicSlideBoxDelegate) {
  $scope.scrollTo = function(index){
    $location.hash(index);
    $ionicScrollDelegate.anchorScroll(true);
  };
  $scope.next = function() {
    $ionicSlideBoxDelegate.next();
  }
  $scope.previous = function() {
    $ionicSlideBoxDelegate.previous();
  }
  $scope.slide = function(index) {
    $ionicSlideBoxDelegate.slide(index);
  }
}


$(document).ready(function(){
  $("#About, #Education, #Activities, #Contact").click(function(){
    var $this = $(this),
      flag = $this.data("clickflag") || false;
    if (!flag) {
      $(this).animate({width:'95%',height:$(window).height()*1.0});
    } else {
      $(this).animate({width:'80%',height:'400px'});
    }
    $this.data("clickflag", !flag);
  });
});
