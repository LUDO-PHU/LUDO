using System;

namespace BaseCore.Entities
{
    public class Banner
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;    
        public string ImageUrl { get; set; } = string.Empty;       
        public string TargetUrl { get; set; } = string.Empty;      
        public string Position { get; set; } = "Top";      
        public bool IsActive { get; set; } = true;     
    }
}
