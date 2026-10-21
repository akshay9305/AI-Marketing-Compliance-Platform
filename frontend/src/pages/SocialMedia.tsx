import { useState, useRef, useEffect } from 'react';
import { Instagram, Linkedin, Facebook, Twitter, Globe, Wand2, CheckCircle, AlertTriangle, ExternalLink, ChevronDown, Plus, Eye, Copy, Upload, X } from 'lucide-react';
import.meta.env.VITE_API_URL
interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  maxLength: number;
  features: string[];
}
 
interface SocialPost {
  platform: string;
  content: string;
  hashtags: string[];
  ctaLinks: { text: string; url: string }[];
  images: string[];
}
 
interface ValidationResult {
  compliance_score: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
  platform_specific: {
    character_count: number;
    hashtag_count: number;
    link_count: number;
  };
}
 
const SocialMedia = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');
  const [prompt, setPrompt] = useState<string>('');
  const [generatedPost, setGeneratedPost] = useState<SocialPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [showElementDropdown, setShowElementDropdown] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [isExpediaUser, setIsExpediaUser] = useState<boolean>(false);
  const [tone, setTone] = useState<string>('friendly');

 
  // Helper function to check if user is from Expedia
  const checkExpediaUser = () => {
    const storedEmail = localStorage.getItem('user_email') || '';
    const isExpedia = storedEmail.toLowerCase().endsWith('@expedia.com');
    setIsExpediaUser(isExpedia);
  };
 
  // Close dropdown when clicking outside
  useEffect(() => {
    checkExpediaUser();
  }, []);
 
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowElementDropdown(false);
      }
    };
 
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
 
  const platforms: Platform[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram size={20} />,
      maxLength: 2200,
      features: ['Hashtags', 'Stories', 'Reels', 'Images']
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <Linkedin size={20} />,
      maxLength: 3000,
      features: ['Professional tone', 'Articles', 'Career content']
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook size={20} />,
      maxLength: 63206,
      features: ['Events', 'Groups', 'Pages', 'Long-form content']
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: <Twitter size={20} />,
      maxLength: 280,
      features: ['Threads', 'Trending topics', 'Real-time']
    },
    {
      id: 'other',
      name: 'Other',
      icon: <Globe size={20} />,
      maxLength: 1000,
      features: ['Generic format', 'Customizable']
    }
  ];
 
  const generatePost = async () => {
    if (!prompt.trim()) return;
 
    setIsGenerating(true);
    try {
      // TODO: Replace with actual AI API call
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/social-media/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          prompt: prompt,
          tone: tone,  
        }),
      });
 
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
       
        // Combine content and hashtags for editing
        const contentWithHashtags = data.hashtags && data.hashtags.length > 0
          ? `${data.content}\n\n${data.hashtags.join(' ')}`
          : data.content;
       
        setGeneratedPost({
          ...data,
          content: contentWithHashtags
        });
      } else {
        // Fallback mock data for now
        const mockPost = {
          platform: selectedPlatform,
          content: `🚀 Exciting announcement! ${prompt}\n\nJoin us on this incredible journey and discover what makes us different. Innovation meets excellence in every step we take.\n\n✨ Ready to get started?`,
          hashtags: [], // Start with empty hashtags - user can add them via dropdown
          ctaLinks: [], // Start with empty CTA links - user can add them via dropdown
          images: []
        };
        console.log('Setting mock post:', mockPost);
        setGeneratedPost(mockPost);
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
      // Mock fallback
      setGeneratedPost({
        platform: selectedPlatform,
        content: `🚀 Exciting announcement! ${prompt}\n\nJoin us on this incredible journey and discover what makes us different. Innovation meets excellence in every step we take.\n\n✨ Ready to get started?`,
        hashtags: [], // Start with empty hashtags - user can add them via dropdown
        ctaLinks: [], // Start with empty CTA links - user can add them via dropdown
        images: []
      });
    } finally {
      setIsGenerating(false);
    }
  };
 
  const validateCompliance = async () => {
    if (!generatedPost) return;
 
    setIsValidating(true);
    try {
      // TODO: Replace with actual compliance API call
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/social-media/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          content: generatedPost.content,
          hashtags: generatedPost.hashtags,
          ctaLinks: generatedPost.ctaLinks,
        }),
      });
 
      if (response.ok) {
        const data = await response.json();
        setValidationResults(data);
      } else {
        // Mock validation results
        setValidationResults({
          compliance_score: 85,
          issues: [
            { severity: 'warning', message: 'Consider adding more specific hashtags for better reach' },
            { severity: 'info', message: 'Content length is optimal for the selected platform' }
          ],
          platform_specific: {
            character_count: generatedPost.content.length,
            hashtag_count: generatedPost.hashtags.length,
            link_count: generatedPost.ctaLinks.length
          }
        });
      }
    } catch (error) {
      console.error('Failed to validate compliance:', error);
      // Mock validation
      setValidationResults({
        compliance_score: 85,
        issues: [
          { severity: 'warning', message: 'Consider adding more specific hashtags for better reach' },
          { severity: 'info', message: 'Content length is optimal for the selected platform' }
        ],
        platform_specific: {
          character_count: generatedPost.content.length,
          hashtag_count: generatedPost.hashtags.length,
          link_count: generatedPost.ctaLinks.length
        }
      });
    } finally {
      setIsValidating(false);
    }
  };
 
  const saveGeneratedPost = async () => {
    if (!generatedPost) return;
 
    const name = `Social Post - ${selectedPlatform} - ${new Date().toISOString()}`;
    const payload = {
      name,
      category: 'social',
      description: prompt || '',
      html_content: generatedPost.content || '',
      modules: [
        { type: 'social_post', platform: selectedPlatform, hashtags: generatedPost.hashtags },
        { ctaLinks: generatedPost.ctaLinks },
      ],
      compliance_score: 0,
    };
 
    try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
 
      let templateEntry: any = { ...payload };
      if (resp.ok) {
        const data = await resp.json();
        templateEntry = { ...templateEntry, id: data.id, compliance_score: data.compliance_score || 0 };
      } else {
        // server failed - save locally without id
        console.warn('Failed to save on server, saving locally');
      }
 
      // Persist to localStorage so Compliance page can pick it up
      try {
        const raw = localStorage.getItem('local_templates');
        const arr = raw ? JSON.parse(raw) : [];
        // put newest first
        arr.unshift(templateEntry);
        localStorage.setItem('local_templates', JSON.stringify(arr.slice(0, 50)));
        // Notify other tabs/components that local templates updated
        try {
          window.dispatchEvent(new CustomEvent('local_templates_updated'));
        } catch (e) {
          // ignore if dispatch fails
        }
      } catch (e) {
        console.error('Failed to persist saved post to local_templates', e);
      }
 
      // Optionally give immediate feedback in UI
      // You could show a toast; for now, reuse preview modal
      setShowPreviewModal(false);
      setGeneratedPost(prev => ({ ...(prev as SocialPost) }));
    } catch (err) {
      console.error('Error saving generated post:', err);
      // Fallback to localStorage only
      try {
        const raw = localStorage.getItem('local_templates');
        const arr = raw ? JSON.parse(raw) : [];
        const templateEntry = { ...payload };
        arr.unshift(templateEntry);
        localStorage.setItem('local_templates', JSON.stringify(arr.slice(0, 50)));
        try {
          window.dispatchEvent(new CustomEvent('local_templates_updated'));
        } catch (e) {}
      } catch (e) {
        console.error('Failed to persist fallback saved post', e);
      }
    }
  };
 
  const updateContent = (newContent: string) => {
    if (generatedPost) {
      // Extract hashtags from content
      const hashtagPattern = /#\w+/g;
      const foundHashtags = newContent.match(hashtagPattern) || [];
     
      setGeneratedPost({
        ...generatedPost,
        content: newContent,
        hashtags: foundHashtags
      });
    }
  };
 
  // ...existing code continues
 
  // Element insertion functionality
  const insertElementAtCursor = (element: string, type?: string) => {
    console.log('insertElementAtCursor called with:', { element, type });
    if (!generatedPost || !contentRef.current) return;
 
    if (type === 'image') {
      console.log('Opening image upload modal');
      setShowImageUpload(true);
      setShowElementDropdown(false);
      return;
    }
 
    if (type === 'cta') {
      console.log('Opening CTA modal');
      setShowCtaModal(true);
      setShowElementDropdown(false);
      return;
    }
 
    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = generatedPost.content;
   
    const newContent = content.substring(0, start) + element + content.substring(end);
    updateContent(newContent);
   
    // Set cursor position after inserted element
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + element.length, start + element.length);
    }, 0);
  };
 
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Image upload triggered, file:', file, 'generatedPost:', generatedPost);
    if (file && generatedPost) {
      // Create a local URL for the image
      const imageUrl = URL.createObjectURL(file);
      console.log('Created image URL:', imageUrl);
     
      // Insert image placeholder in content at cursor position
      const imageText = `📸 [Image: ${file.name}]\n`;
      if (contentRef.current) {
        const textarea = contentRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
       
        // Use the content from the updated state callback
        setGeneratedPost(prevPost => {
          if (!prevPost) return prevPost;
          const content = prevPost.content;
          const newContent = content.substring(0, start) + imageText + content.substring(end);
         
          const updatedPost: SocialPost = {
            ...prevPost,
            content: newContent,
            images: [...prevPost.images, imageUrl]
          };
          console.log('Updated post with image and content:', updatedPost);
          return updatedPost;
        });
       
        // Set cursor position after inserted element
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + imageText.length, start + imageText.length);
        }, 0);
      } else {
        // If no textarea ref, just add to images array
        setGeneratedPost(prevPost => {
          if (!prevPost) return prevPost;
          const updatedPost: SocialPost = {
            ...prevPost,
            images: [...prevPost.images, imageUrl]
          };
          console.log('Updated post with image only:', updatedPost);
          return updatedPost;
        });
      }
     
      setShowImageUpload(false);
    }
  };
 
  const handleCtaSubmit = () => {
    console.log('CTA submit triggered, ctaText:', ctaText, 'ctaUrl:', ctaUrl, 'generatedPost:', generatedPost);
    if (ctaText.trim() && ctaUrl.trim() && generatedPost) {
      // Insert CTA text and add to array in single state update
      const ctaTextFormatted = `🔗 ${ctaText}`;
     
      if (contentRef.current) {
        const textarea = contentRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
       
        // Update both content and CTA array in single state update
        setGeneratedPost(prevPost => {
          if (!prevPost) return prevPost;
          const content = prevPost.content;
          const newContent = content.substring(0, start) + ctaTextFormatted + content.substring(end);
         
          const updatedPost: SocialPost = {
            ...prevPost,
            content: newContent,
            ctaLinks: [...prevPost.ctaLinks, { text: ctaText, url: ctaUrl }]
          };
          console.log('Updated post with CTA and content:', updatedPost);
          return updatedPost;
        });
       
        // Set cursor position after inserted element
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + ctaTextFormatted.length, start + ctaTextFormatted.length);
        }, 0);
      } else {
        // If no textarea ref, just add to CTA array
        setGeneratedPost(prevPost => {
          if (!prevPost) return prevPost;
          const updatedPost: SocialPost = {
            ...prevPost,
            ctaLinks: [...prevPost.ctaLinks, { text: ctaText, url: ctaUrl }]
          };
          console.log('Updated post with CTA only:', updatedPost);
          return updatedPost;
        });
      }
 
      // Reset and close modal
      setCtaText('');
      setCtaUrl('');
      setShowCtaModal(false);
    }
  };
 
  const removeImage = (index: number) => {
    if (generatedPost) {
      const newImages = [...generatedPost.images];
      URL.revokeObjectURL(newImages[index]); // Clean up the object URL
      newImages.splice(index, 1);
      setGeneratedPost({
        ...generatedPost,
        images: newImages
      });
    }
  };
 
  const getAvailableElements = () => {
    const platform = selectedPlatform;
    const baseElements = [
      { type: 'emoji', label: 'Popular Emojis', items: ['🚀', '🎯', '💡', '🌟', '🔥', '💫', '✨', '🎉', '👏', '❤️', '💪', '🙌'] },
      { type: 'hashtag', label: 'Suggested Hashtags', items: generateSuggestedHashtags() },
      { type: 'mention', label: 'Mentions', items: ['@company', '@team', '@customer'] },
      { type: 'image', label: 'Media', items: [{ text: '📸 Upload Image', action: 'upload-image' }] },
      { type: 'cta', label: 'Call to Actions', items: [{ text: '� Add Link', action: 'add-cta' }] }
    ];
 
    if (platform === 'instagram') {
      baseElements[0].items = ['📸', '🎥', '📱', '💝', '🌈', '☀️', '🌊', '🍃', '💕', '✨', '🦋', '🌺'];
    } else if (platform === 'linkedin') {
      baseElements[0].items = ['💼', '📊', '🎯', '💡', '🚀', '📈', '🤝', '💪', '🌟', '🔑', '⚡', '🏆'];
    } else if (platform === 'twitter') {
      baseElements[0].items = ['🔥', '💯', '⚡', '🚀', '👀', '🤔', '😂', '👏', '🙌', '💪', '🎯', '✨'];
    }
 
    return baseElements;
  };
 
  const generateSuggestedHashtags = () => {
    const platformHashtags = {
      instagram: ['#instadaily', '#photooftheday', '#instagood', '#follow', '#picoftheday'],
      linkedin: ['#professional', '#career', '#business', '#networking', '#leadership'],
      facebook: ['#community', '#family', '#friends', '#memories', '#life'],
      twitter: ['#trending', '#breaking', '#news', '#viral', '#thread'],
      other: ['#social', '#content', '#digital', '#online', '#media']
    };
   
    return platformHashtags[selectedPlatform as keyof typeof platformHashtags] || platformHashtags.other;
  };
 
  const getPlatformTip = (platform: string) => {
    const tips = {
      instagram: 'Use high-quality visuals and story highlights for maximum engagement',
      linkedin: 'Share professional insights and industry knowledge to build authority',
      facebook: 'Focus on community building and meaningful conversations',
      twitter: 'Keep it concise, use trending hashtags, and engage in real-time discussions',
      other: 'Adapt your content to your specific platform\'s audience and best practices'
    };
   
    return tips[platform as keyof typeof tips] || tips.other;
  };
 
  const formatPreviewContent = () => {
    if (!generatedPost) return { text: '', hasImages: false, hasLinks: false };
   
    let content = generatedPost.content;
   
    // Remove image placeholders from text content
    content = content.replace(/📸\s+\[Image:\s+[^\]]+\]/g, '');
    content = content.replace(/📸\s*\[Image:\s*[^\]]+\]/g, '');
    content = content.replace(/\[Image:\s*[^\]]+\]/g, '');
    content = content.replace(/📸\s*/g, '');
   
    // Remove CTA link text from content
    content = content.replace(/🔗\s+[^\n]+/g, '');
    content = content.replace(/🔗[^\n]+/g, '');
   
    // Clean up extra newlines and spaces
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/^\s+|\s+$/g, '');
    content = content.replace(/\n\s+/g, '\n');
   
    // Only add hashtags if user has actually added some
    if (generatedPost.hashtags.length > 0) {
      content += '\n\n' + generatedPost.hashtags.join(' ');
    }
   
    return {
      text: content,
      hasImages: generatedPost.images.length > 0,
      hasLinks: generatedPost.ctaLinks.length > 0
    };
  };
 
  const renderInlinePreviewContent = () => {
    if (!generatedPost) return null;
   
    let content = generatedPost.content;
    let imageIndex = 0;
    let ctaIndex = 0;
   
    // Split content by lines to process each part
    const lines = content.split('\n');
    const processedLines = lines.map((line, index) => {
      // Check if this line contains an image placeholder
      if (line.includes('📸') && line.includes('[Image:')) {
        if (imageIndex < generatedPost.images.length) {
          const imageUrl = generatedPost.images[imageIndex];
          const imageName = line.match(/\[Image:\s*([^\]]+)\]/)?.[1] || `Image ${imageIndex + 1}`;
          imageIndex++;
          return (
            <div key={`image-${index}`} className="my-3">
              <img
                src={imageUrl}
                alt={imageName}
                className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
              />
            </div>
          );
        }
        return null; // Skip if no more images
      }
     
      // Check if this line contains a CTA link
      if (line.includes('🔗')) {
        if (ctaIndex < generatedPost.ctaLinks.length) {
          const cta = generatedPost.ctaLinks[ctaIndex];
          ctaIndex++;
          return (
            <div key={`cta-${index}`} className="my-2">
              <a
                href={cta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm transition-colors"
              >
                <ExternalLink size={14} />
                <span>{cta.text}</span>
              </a>
            </div>
          );
        }
        return null; // Skip if no more CTAs
      }
     
      // Regular text line
      if (line.trim()) {
        return <div key={`text-${index}`} className="whitespace-pre-wrap">{line}</div>;
      } else {
        return <div key={`space-${index}`} className="h-4"></div>; // Empty line spacing
      }
    }).filter(Boolean); // Remove null entries
   
    // Add hashtags at the end if any
    if (generatedPost.hashtags.length > 0) {
      processedLines.push(
        <div key="hashtags" className="mt-4 text-blue-600">
          {generatedPost.hashtags.join(' ')}
        </div>
      );
    }
   
    return <div className="space-y-2">{processedLines}</div>;
  };
 
  const copyCompletePost = async () => {
    const content = formatPreviewContent();
    let textToCopy = content.text;
   
    // Add CTA links in a clean format
    if (generatedPost && generatedPost.ctaLinks.length > 0) {
      textToCopy += '\n\n';
      generatedPost.ctaLinks.forEach(link => {
        textToCopy += `🔗 ${link.text}: ${link.url}\n`;
      });
    }
   
    try {
      await navigator.clipboard.writeText(textToCopy);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
 
  const selectedPlatformData = platforms.find(p => p.id === selectedPlatform);
  const characterCount = generatedPost?.content.length || 0;
  const maxLength = selectedPlatformData?.maxLength || 1000;
 
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Creation</h2>
          <p className="text-gray-600 mt-1">Create engaging social media content with AI assistance</p>
        </div>
       
        {generatedPost && (
          <div className="flex items-center space-x-3">
            <button
              onClick={validateCompliance}
              disabled={isValidating}
              className="btn-secondary flex items-center space-x-2"
            >
              {isValidating ? (
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              ) : (
                <CheckCircle size={16} />
              )}
              <span>Validate Compliance</span>
            </button>
 
            <button
              onClick={saveGeneratedPost}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Save Post</span>
            </button>
          </div>
        )}
      </div>
 
      {/* Asset Management Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isExpediaUser ? (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Expedia Team Member
                  </div>
                </div>
                <p className="text-gray-700 font-medium mb-1">Access to Mars's Media & Inventory</p>
                <p className="text-gray-600 text-sm mb-4">
                  You have full access to Expedia's media library and product inventory for content creation.
                </p>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Browse Media Library
                  </button>
                  <button className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                    Browse Inventory
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    📤 Social Media Marketing
                  </div>
                </div>
                <p className="text-gray-700 font-medium mb-1">Upload Your Media Assets</p>
                <p className="text-gray-600 text-sm mb-4">
                  Affiliate partners upload their own media assets. Note: Only Mars team members have access to Mars's inventory and media library.
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  + Upload Media
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg">
              <div className="font-medium text-gray-900">Coming Soon</div>
              <div className="text-xs text-gray-500">Feature in development</div>
            </div>
          </div>
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Input */}
        <div className="space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Platform</label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPlatform === platform.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${selectedPlatform === platform.id ? 'text-blue-600' : 'text-gray-500'}`}>
                      {platform.icon}
                    </div>
                    <div className="text-left">
                      <div className={`font-medium ${selectedPlatform === platform.id ? 'text-blue-900' : 'text-gray-900'}`}>
                        {platform.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {platform.maxLength} chars max
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
           
            {selectedPlatformData && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  <strong>Platform features:</strong> {selectedPlatformData.features.join(', ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  💡 Tip: {getPlatformTip(selectedPlatform)}
                </div>
              </div>
            )}
          </div>
 
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your post content
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Announce our new product launch with a focus on innovation and customer benefits..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
 
{/* Tone Dropdown */}
<div className="mt-3">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Tone
  </label>

  <div className="relative">
    <select
      value={tone}
      onChange={(e) => setTone(e.target.value)}
      className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="friendly">Friendly</option>
      <option value="professional">Professional</option>
      <option value="casual">Casual</option>
      <option value="inspiring">Inspiring</option>
    </select>

    <ChevronDown
      size={16}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
  </div>
</div>
          {/* Generate Button */}
          <button
            onClick={generatePost}
            disabled={!prompt.trim() || isGenerating}
            className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
          >
            {isGenerating ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Wand2 size={20} />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate using AI'}</span>
          </button>
        </div>
 
        {/* Right Panel - Generated Content */}
        <div className="space-y-6">
          {generatedPost ? (
            <>
              {/* Content Editor */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Generated Content</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={16} />
                      <span>Preview Post</span>
                    </button>
                    <div className={`text-sm ${
                      characterCount > maxLength ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {characterCount}/{maxLength} characters
                    </div>
                  </div>
                </div>
               
                {/* Element Insertion Tools */}
                <div className="mb-3 relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowElementDropdown(!showElementDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    <span>Insert Element</span>
                    <ChevronDown size={16} className={`transition-transform ${showElementDropdown ? 'rotate-180' : ''}`} />
                  </button>
                 
                  {showElementDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {getAvailableElements().map((category) => (
                        <div key={category.type} className="p-3 border-b border-gray-100 last:border-b-0">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">{category.label}</h4>
                          <div className="flex flex-wrap gap-2">
                            {category.items.map((item, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  console.log('Element button clicked:', item);
                                  if (typeof item === 'string') {
                                    insertElementAtCursor(item);
                                  } else {
                                    // Handle special actions
                                    if (item.action === 'upload-image') {
                                      console.log('Triggering image upload');
                                      insertElementAtCursor('', 'image');
                                    } else if (item.action === 'add-cta') {
                                      console.log('Triggering CTA modal');
                                      insertElementAtCursor('', 'cta');
                                    }
                                  }
                                  setShowElementDropdown(false);
                                }}
                                className="px-2 py-1 text-sm bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded border transition-colors"
                              >
                                {typeof item === 'string' ? item : item.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
 
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edit Content</label>
                    <textarea
                      ref={contentRef}
                      value={generatedPost.content}
                      onChange={(e) => updateContent(e.target.value)}
                      className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                      placeholder="Click 'Insert Element' above to add emojis, hashtags, and more..."
                    />
                  </div>
                 
                  {/* Show uploaded images as thumbnails below the editor */}
                  {generatedPost.images.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">📸 Attached Images (will appear in post)</label>
                      <div className="flex flex-wrap gap-3">
                        {generatedPost.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Upload ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border-2 border-blue-200 shadow-sm"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">💡 These images will be displayed with your post on social media</p>
                    </div>
                  )}
                 
                </div>
              </div>
 
            </>
          ) : (
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Wand2 size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Generate content to get started</p>
                <p className="text-gray-400 text-sm">Choose a platform and describe your post</p>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Image</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
           
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Choose an image to upload</p>
                <p className="text-gray-400 text-sm mb-4">PNG, JPG, GIF up to 10MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Select Image
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* CTA Link Modal */}
      {showCtaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Call-to-Action Link</h3>
              <button
                onClick={() => {
                  setShowCtaModal(false);
                  setCtaText('');
                  setCtaUrl('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
           
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Text</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g., Learn More, Get Started, Download Now"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
             
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowCtaModal(false);
                    setCtaText('');
                    setCtaUrl('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCtaSubmit}
                  disabled={!ctaText.trim() || !ctaUrl.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Validation Results */}
      {validationResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Compliance Validation Results</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                validationResults.compliance_score >= 90 ? 'bg-green-500' :
                validationResults.compliance_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="font-medium">Score: {validationResults.compliance_score}/100</span>
            </div>
          </div>
 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Issues & Recommendations</h4>
              <div className="space-y-2">
                {validationResults.issues.map((issue, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    {issue.severity === 'error' ? (
                      <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle size={16} className="text-yellow-500 mt-0.5" />
                    ) : (
                      <CheckCircle size={16} className="text-blue-500 mt-0.5" />
                    )}
                    <span className="text-sm text-gray-700">{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
 
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Platform Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Character count:</span>
                  <span className="font-medium">{validationResults.platform_specific.character_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hashtags:</span>
                  <span className="font-medium">{validationResults.platform_specific.hashtag_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Links:</span>
                  <span className="font-medium">{validationResults.platform_specific.link_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Post Preview</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyCompletePost}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                >
                  <Copy size={16} />
                  <span>Copy Text</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
           
            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {/* Platform badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                  </span>
                </div>
               
                {/* Post Content */}
                <div className="text-sm leading-relaxed">
                  {renderInlinePreviewContent()}
                </div>
               
                {/* Character count footer */}
                <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 text-center">
                  {formatPreviewContent().text.length} characters
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default SocialMedia;